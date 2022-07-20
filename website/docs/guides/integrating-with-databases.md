---
title: Integrating with databases
sidebar_label: Integrating with databases
---

# Integrating with databases

Working with a database with graphql can sometimes be a little difficult and some principles have to be followed
to avoid performance or safety issues.

In this guide, we will cover few advices to work with databases. The examples will use postgres node client but
the concepts is applicable to every database.

## Use only one client per request

The first common error is to use a connection pool directly in the resolvers.

```ts
const pool = new Pool({ maxClients: 10 })

const resolvers = {
  Query: {
    bills: () => pool.query(SELECT_ALL_BILLS)
  },
  Bill: {
    payer: bill => pool.query({ text: SELECT_PAYER_BY_ID, values: [bill.payer_id] })
  }
}
```

In this example, you can very quickly totally starve your api with a simple request :

```graphql
{
  bills {
    payer
  }
}
```

Because we use directly the pool of connection, each resolver will request a client to do its request.
If you have, for example 100 bills, this request can starve the connection pool for other users.
The server will be stuck and unresponsive for any incoming request while it is not fully resolved.

The better way to avoid this is to open only one client per request. With envelop, we can easily create
a plugin which adds a client to the context add release it at the end of the request execution.

```ts
import { isAsyncIterable } from '@envelop/core'
import { useSchema } from './use-schema'

const pool = new Pool({ maxClients: 10 })

const databaseClientPlugin = {
  async onExecute({ extendContext }) {
    extendContext({ client: await pool.getClient() })
    return {
      async onExecuteDone({ result, args: { contextValue } }) {
        if (isAsyncIterable(result)) throw TypeError('Not implemented')
        await contextValue.client.release(result.errors)
      }
    }
  }
}

const resolvers = {
  Query: {
    bills: (_, __, { client }) => client.query(SELECT_ALL_BILLS)
  },
  Bill: {
    payer: (bill, _, { client }) => client.query({ text: SELECT_PAYER_BY_ID, values: [bill.payer_id] })
  }
}

const getEnvelop = envelop({
  plugins: [useSchema(/*...*/), databaseClientPlugin]
})
```

## Wrap every request in a transaction

Now that we have one uniq client during all the execution phase, we can add some fancy features.

For more safety, every mutations should be encapsulated in a transaction. Doing it by hand is difficult,
error prone and easy to forget. The better way to do it is to automatically wrap every mutation in transaction.

Let's see how we can change our plugin to implement this.

```ts
const databaseClientPlugin = {
  async onExecute({ extendContext }) {
    const client = await pool.getClient()
    extendContext({ client })
    await client.query('BEGIN')

    return {
      async onExecuteDone({ result, args: { contextValue } }) {
        const error = result.errors
        try {
          if (isAsyncIterable(result)) throw TypeError('Not implemented')
          if (result.errors) throw result.errors
          await contextValue.client.query('COMMIT')
        } catch (err) {
          error = err
          await contextValue.client.query('ROLLBACK')
        } finally {
          await contextValue.client.release(error)
        }
      }
    }
  }
}
```

## Enforcing read only queries

Now that we are able to wrap every request in a transaction, we can do even better.
For now we, are making a transaction for every requests, but only mutations should need one.

We can configure transactions differently between query and mutation.

```ts
const databaseClientPlugin = {
  async onExecute({ extendContext, args: { contextValue } }) {
    const client = await pool.getClient()
    extendContext({ client })

    // We can find in the context the kind of request we are executing
    if (contextValue?.operation?.operation === mutation) {
      await client.query('BEGIN')
    } else {
      await client.query('BEGIN READ ONLY')
    }

    return {
      async onExecuteDone({ result, args: { contextValue } }) {
        const error = result.errors
        try {
          if (isAsyncIterable(result)) throw TypeError('Not implemented')
          if (result.errors) throw result.errors
          await contextValue.client.query('COMMIT')
        } catch (err) {
          error = err
          await contextValue.client.query('ROLLBACK')
        } finally {
          await contextValue.client.release(error)
        }
      }
    }
  }
}
```

## Transactions over multiple databases

Some severs will need to do some modifications on multiple databases in a single mutation.

We could just add our new client and just begin/release/rollback as usual. But what happen if an error occur
during the commit of the second database ? You will have data updated in the first database, and data rollbacked
in the second one, causing the system to be in a inconsistent state.

To solve this we can use Tow Phase Commit, which is supported by most of databases except few ones...
(yes I'm looking at you Mongo).

```ts
import pre from '@changesets/cli/dist/declarations/src/commands/pre'

const databaseClientPlugin = {
  async onExecute({ extendContext, args: { contextValue } }) {
    const client1 = await pool1.getClient()
    const client2 = await pool2.getClient()
    const clients = [client1, client2]
    extendContext({ db1: client1, db2: client2, clients })

    // We can find in the context the kind of request we are executing
    if (contextValue?.operation?.operation === mutation) {
      await Promise.all(clients.map(client => client.query('BEGIN')))
    } else {
      await Promise.all(clients.map(client => client.query('BEGIN')))
    }

    return {
      async onExecuteDone({ result, args: { contextValue } }) {
        const error = result.errors
        const preparedCommits = new Map()
        try {
          if (isAsyncIterable(result)) throw TypeError('Not implemented')
          if (result.errors) throw result.errors
          const commits = Promise.allSettled(
            contextValue.clients.map(async client => {
              const commitId = uuid()
              preparedCommits.set(client, commitId)
              await client.query(`PREPARE COMMIT ${commitId}`)
            })
          )

          if (commits.some(commit => commit.some(result => result.status === 'rejected'))) {
            throw Error('Error during commit phase')
          }
        } catch (err) {
          error = err
          Promise.allSettled(
            contextValue.clients.map(async client => {
              const commitId = preparedCommits.get(client)
              if (commitId) await client.query(`ROLLBACK PREPARED ${commitId}`)
              else await client.query('ROLLBACK')
            })
          )

          if (commits.some(commit => commit.some(result => result.status === 'rejected'))) {
            throw Error('Error during rollback phase')
          }
        } finally {
          await Promise.all(clients.map(client => client.release))
        }
      }
    }
  }
}
```
