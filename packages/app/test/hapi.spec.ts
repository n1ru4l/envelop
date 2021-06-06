import EventSource from 'eventsource';
import got from 'got';
import { printSchema } from 'graphql';

import { HelloDocument, UsersDocument } from './generated/envelop.generated';
import { commonImplementation, readFile, startHapiServer } from './utils';

const serverReady = startHapiServer({
  options: {
    scalars: '*',
    enableCodegen: true,
    cache: {
      parse: false,
      validation: false,
    },
    buildContext() {
      return {
        foo: 'bar',
      };
    },
  },
  buildOptions: {
    prepare(tools) {
      commonImplementation(tools);
    },
  },
});

test('works', async () => {
  const { query } = await serverReady;

  await query(HelloDocument).then(v => {
    expect(v).toMatchInlineSnapshot(`
      Object {
        "data": Object {
          "hello": "Hello World!",
        },
      }
    `);
  });
});

test('dataloaders', async () => {
  const { query } = await serverReady;

  await query(UsersDocument).then(v => {
    expect(v).toMatchInlineSnapshot(`
      Object {
        "data": Object {
          "users": Array [
            Object {
              "id": 0,
            },
            Object {
              "id": 100,
            },
            Object {
              "id": 200,
            },
            Object {
              "id": 300,
            },
            Object {
              "id": 400,
            },
            Object {
              "id": 500,
            },
            Object {
              "id": 600,
            },
            Object {
              "id": 700,
            },
            Object {
              "id": 800,
            },
            Object {
              "id": 900,
            },
          ],
        },
      }
    `);
  });
});

test('outputSchema result', async () => {
  const { tmpSchemaPath, codegenPromise } = await serverReady;

  await codegenPromise;

  expect(tmpSchemaPath).toBeTruthy();

  expect(
    await readFile(tmpSchemaPath!, {
      encoding: 'utf-8',
    })
  ).toMatchInlineSnapshot(`
    "schema {
      query: Query
      subscription: Subscription
    }

    type Query {
      hello: String!
      users: [User!]!
      stream: [String!]!
    }

    type User {
      id: Int!
    }

    type Subscription {
      ping: String!
    }

    \\"\\"\\"
    A date string, such as 2007-12-03, compliant with the \`full-date\` format outlined in section 5.6 of the RFC 3339 profile of the ISO 8601 standard for representation of dates and times using the Gregorian calendar.
    \\"\\"\\"
    scalar Date

    \\"\\"\\"
    A time string at UTC, such as 10:15:30Z, compliant with the \`full-time\` format outlined in section 5.6 of the RFC 3339profile of the ISO 8601 standard for representation of dates and times using the Gregorian calendar.
    \\"\\"\\"
    scalar Time

    \\"\\"\\"
    A date-time string at UTC, such as 2007-12-03T10:15:30Z, compliant with the \`date-time\` format outlined in section 5.6 of the RFC 3339 profile of the ISO 8601 standard for representation of dates and times using the Gregorian calendar.
    \\"\\"\\"
    scalar DateTime

    \\"\\"\\"
    The javascript \`Date\` as integer. Type represents date and time as number of milliseconds from start of UNIX epoch.
    \\"\\"\\"
    scalar Timestamp

    \\"\\"\\"
    A field whose value is a UTC Offset: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
    \\"\\"\\"
    scalar UtcOffset

    \\"\\"\\"
    A string representing a duration conforming to the ISO8601 standard,
    such as: P1W1DT13H23M34S
    P is the duration designator (for period) placed at the start of the duration representation.
    Y is the year designator that follows the value for the number of years.
    M is the month designator that follows the value for the number of months.
    W is the week designator that follows the value for the number of weeks.
    D is the day designator that follows the value for the number of days.
    T is the time designator that precedes the time components of the representation.
    H is the hour designator that follows the value for the number of hours.
    M is the minute designator that follows the value for the number of minutes.
    S is the second designator that follows the value for the number of seconds.

    Note the time designator, T, that precedes the time value.

    Matches moment.js, Luxon and DateFns implementations
    ,/. is valid for decimal places and +/- is a valid prefix
    \\"\\"\\"
    scalar Duration

    \\"\\"\\"
    A string representing a duration conforming to the ISO8601 standard,
    such as: P1W1DT13H23M34S
    P is the duration designator (for period) placed at the start of the duration representation.
    Y is the year designator that follows the value for the number of years.
    M is the month designator that follows the value for the number of months.
    W is the week designator that follows the value for the number of weeks.
    D is the day designator that follows the value for the number of days.
    T is the time designator that precedes the time components of the representation.
    H is the hour designator that follows the value for the number of hours.
    M is the minute designator that follows the value for the number of minutes.
    S is the second designator that follows the value for the number of seconds.

    Note the time designator, T, that precedes the time value.

    Matches moment.js, Luxon and DateFns implementations
    ,/. is valid for decimal places and +/- is a valid prefix
    \\"\\"\\"
    scalar ISO8601Duration

    \\"\\"\\"
    A local date string (i.e., with no associated timezone) in \`YYYY-MM-DD\` format, e.g. \`2020-01-01\`.
    \\"\\"\\"
    scalar LocalDate

    \\"\\"\\"
    A local time string (i.e., with no associated timezone) in 24-hr \`HH:mm[:ss[.SSS]]\` format, e.g. \`14:25\` or \`14:25:06\` or \`14:25:06.123\`.
    \\"\\"\\"
    scalar LocalTime

    \\"\\"\\"
    A local time string (i.e., with no associated timezone) in 24-hr \`HH:mm[:ss[.SSS]]\` format, e.g. \`14:25\` or \`14:25:06\` or \`14:25:06.123\`.  This scalar is very similar to the \`LocalTime\`, with the only difference being that \`LocalEndTime\` also allows \`24:00\` as a valid value to indicate midnight of the following day.  This is useful when using the scalar to represent the exclusive upper bound of a time block.
    \\"\\"\\"
    scalar LocalEndTime

    \\"\\"\\"
    A field whose value conforms to the standard internet email address format as specified in RFC822: https://www.w3.org/Protocols/rfc822/.
    \\"\\"\\"
    scalar EmailAddress @specifiedBy(url: \\"https://www.w3.org/Protocols/rfc822/\\")

    \\"\\"\\"
    Floats that will have a value less than 0.
    \\"\\"\\"
    scalar NegativeFloat

    \\"\\"\\"
    Integers that will have a value less than 0.
    \\"\\"\\"
    scalar NegativeInt

    \\"\\"\\"
    A string that cannot be passed as an empty value
    \\"\\"\\"
    scalar NonEmptyString

    \\"\\"\\"
    Floats that will have a value of 0 or more.
    \\"\\"\\"
    scalar NonNegativeFloat

    \\"\\"\\"
    Integers that will have a value of 0 or more.
    \\"\\"\\"
    scalar NonNegativeInt

    \\"\\"\\"
    Floats that will have a value of 0 or less.
    \\"\\"\\"
    scalar NonPositiveFloat

    \\"\\"\\"
    Integers that will have a value of 0 or less.
    \\"\\"\\"
    scalar NonPositiveInt

    \\"\\"\\"
    A field whose value conforms to the standard E.164 format as specified in: https://en.wikipedia.org/wiki/E.164. Basically this is +17895551234.
    \\"\\"\\"
    scalar PhoneNumber

    \\"\\"\\"
    Floats that will have a value greater than 0.
    \\"\\"\\"
    scalar PositiveFloat

    \\"\\"\\"
    Integers that will have a value greater than 0.
    \\"\\"\\"
    scalar PositiveInt

    \\"\\"\\"
    A field whose value conforms to the standard postal code formats for United States, United Kingdom, Germany, Canada, France, Italy, Australia, Netherlands, Spain, Denmark, Sweden, Belgium, India, Austria, Portugal, Switzerland or Luxembourg.
    \\"\\"\\"
    scalar PostalCode

    \\"\\"\\"
    Floats that will have a value of 0 or more.
    \\"\\"\\"
    scalar UnsignedFloat

    \\"\\"\\"
    Integers that will have a value of 0 or more.
    \\"\\"\\"
    scalar UnsignedInt

    \\"\\"\\"
    A field whose value conforms to the standard URL format as specified in RFC3986: https://www.ietf.org/rfc/rfc3986.txt.
    \\"\\"\\"
    scalar URL

    \\"\\"\\"
    The \`BigInt\` scalar type represents non-fractional signed whole numeric values.
    \\"\\"\\"
    scalar BigInt

    \\"\\"\\"
    The \`BigInt\` scalar type represents non-fractional signed whole numeric values.
    \\"\\"\\"
    scalar Long

    \\"\\"\\"
    The \`Byte\` scalar type represents byte value as a Buffer
    \\"\\"\\"
    scalar Byte

    \\"\\"\\"
    A field whose value is a generic Universally Unique Identifier: https://en.wikipedia.org/wiki/Universally_unique_identifier.
    \\"\\"\\"
    scalar UUID

    \\"\\"\\"
    A field whose value is a generic Universally Unique Identifier: https://en.wikipedia.org/wiki/Universally_unique_identifier.
    \\"\\"\\"
    scalar GUID

    \\"\\"\\"
    A field whose value is a hexadecimal: https://en.wikipedia.org/wiki/Hexadecimal.
    \\"\\"\\"
    scalar Hexadecimal

    \\"\\"\\"
    A field whose value is a hex color code: https://en.wikipedia.org/wiki/Web_colors.
    \\"\\"\\"
    scalar HexColorCode @specifiedBy(url: \\"https://en.wikipedia.org/wiki/Web_colors\\")

    \\"\\"\\"
    A field whose value is a CSS HSL color: https://developer.mozilla.org/en-US/docs/Web/CSS/color_value#hsl()_and_hsla().
    \\"\\"\\"
    scalar HSL @specifiedBy(url: \\"https://developer.mozilla.org/en-US/docs/Web/CSS/color_value#hsl()_and_hsla()\\")

    \\"\\"\\"
    A field whose value is a CSS HSLA color: https://developer.mozilla.org/en-US/docs/Web/CSS/color_value#hsl()_and_hsla().
    \\"\\"\\"
    scalar HSLA

    \\"\\"\\"
    A field whose value is a IPv4 address: https://en.wikipedia.org/wiki/IPv4.
    \\"\\"\\"
    scalar IPv4

    \\"\\"\\"
    A field whose value is a IPv6 address: https://en.wikipedia.org/wiki/IPv6.
    \\"\\"\\"
    scalar IPv6

    \\"\\"\\"
    A field whose value is a ISBN-10 or ISBN-13 number: https://en.wikipedia.org/wiki/International_Standard_Book_Number.
    \\"\\"\\"
    scalar ISBN

    \\"\\"\\"
    A field whose value is a JSON Web Token (JWT): https://jwt.io/introduction.
    \\"\\"\\"
    scalar JWT

    \\"\\"\\"
    A field whose value is a valid decimal degrees latitude number (53.471): https://en.wikipedia.org/wiki/Latitude
    \\"\\"\\"
    scalar Latitude

    \\"\\"\\"
    A field whose value is a valid decimal degrees longitude number (53.471): https://en.wikipedia.org/wiki/Longitude
    \\"\\"\\"
    scalar Longitude

    \\"\\"\\"
    A field whose value is a IEEE 802 48-bit MAC address: https://en.wikipedia.org/wiki/MAC_address.
    \\"\\"\\"
    scalar MAC

    \\"\\"\\"
    A field whose value is a valid TCP port within the range of 0 to 65535: https://en.wikipedia.org/wiki/Transmission_Control_Protocol#TCP_ports
    \\"\\"\\"
    scalar Port

    \\"\\"\\"
    A field whose value is a CSS RGB color: https://developer.mozilla.org/en-US/docs/Web/CSS/color_value#rgb()_and_rgba().
    \\"\\"\\"
    scalar RGB

    \\"\\"\\"
    A field whose value is a CSS RGBA color: https://developer.mozilla.org/en-US/docs/Web/CSS/color_value#rgb()_and_rgba().
    \\"\\"\\"
    scalar RGBA

    \\"\\"\\"
    The \`SafeInt\` scalar type represents non-fractional signed whole numeric values that are considered safe as defined by the ECMAScript specification.
    \\"\\"\\"
    scalar SafeInt @specifiedBy(url: \\"https://www.ecma-international.org/ecma-262/#sec-number.issafeinteger\\")

    \\"\\"\\"
    A currency string, such as $21.25
    \\"\\"\\"
    scalar USCurrency

    \\"\\"\\"
    A field whose value is a Currency: https://en.wikipedia.org/wiki/ISO_4217.
    \\"\\"\\"
    scalar Currency @specifiedBy(url: \\"https://en.wikipedia.org/wiki/ISO_4217\\")

    \\"\\"\\"
    The \`JSON\` scalar type represents JSON values as specified by [ECMA-404](http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf).
    \\"\\"\\"
    scalar JSON @specifiedBy(url: \\"http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf\\")

    \\"\\"\\"
    The \`JSONObject\` scalar type represents JSON objects as specified by [ECMA-404](http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf).
    \\"\\"\\"
    scalar JSONObject @specifiedBy(url: \\"http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf\\")

    \\"\\"\\"
    A field whose value is an International Bank Account Number (IBAN): https://en.wikipedia.org/wiki/International_Bank_Account_Number.
    \\"\\"\\"
    scalar IBAN

    \\"\\"\\"
    A field whose value conforms with the standard mongodb object ID as described here: https://docs.mongodb.com/manual/reference/method/ObjectId/#ObjectId. Example: 5e5677d71bdc2ae76344968c
    \\"\\"\\"
    scalar ObjectID

    \\"\\"\\"
    Represents NULL values
    \\"\\"\\"
    scalar Void
    "
  `);
});

test('altair', async () => {
  const { request } = await serverReady;

  expect(
    (
      await request({
        path: '/altair/',
        method: 'GET',
      })
    ).slice(0, 300)
  ).toMatchInlineSnapshot(`
    "<!doctype html>
    <html>

    <head>
      <meta charset=\\"utf-8\\">
      <title>Altair</title>
      <base href=\\"/altair/\\">
      <meta name=\\"viewport\\" content=\\"width=device-width,initial-scale=1\\">
      <link rel=\\"icon\\" type=\\"image/x-icon\\" href=\\"favicon.ico\\">
      <link href=\\"styles.css\\" rel=\\"stylesheet\\" />
    </head>

    <body>
      <a"
  `);

  expect(
    (
      await request({
        path: '/altair/styles.css',
        method: 'GET',
      })
    ).slice(0, 300)
  ).toMatchInlineSnapshot(
    `"@charset \\"UTF-8\\";[class*=ant-]::-ms-clear,[class*=ant-] input::-ms-clear,[class*=ant-] input::-ms-reveal,[class^=ant-]::-ms-clear,[class^=ant-] input::-ms-clear,[class^=ant-] input::-ms-reveal{display:none}[class*=ant-],[class*=ant-] *,[class*=ant-] :after,[class*=ant-] :before,[class^=ant-],[class^"`
  );
});

test('graphiql', async () => {
  const { request } = await serverReady;

  expect(
    (
      await request({
        path: '/graphiql',
        method: 'GET',
      })
    ).slice(0, 300)
  ).toMatchInlineSnapshot(`
    "
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset=\\"utf-8\\" />
        <title>GraphiQL</title>
        <meta name=\\"robots\\" content=\\"noindex\\" />
        <meta name=\\"referrer\\" content=\\"origin\\" />
        <meta name=\\"viewport\\" content=\\"width=device-width, initial-scale=1\\" />
        <link
          rel=\\"icon\\"
          type=\\"image"
  `);
});

test('query with @stream', async () => {
  const { address } = await serverReady;
  const stream = got.stream.post(`${address}/graphql`, {
    json: {
      query: `
      query {
        stream @stream(initialCount: 1)
      }
      `,
    },
  });

  const chunks: string[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk.toString());
  }
  expect(chunks).toHaveLength(3);
  expect(chunks[0]).toContain(`{"data":{"stream":["A"]},"hasNext":true}`);
  expect(chunks[1]).toContain(`{"data":"B","path":["stream",1],"hasNext":true}`);
  expect(chunks[2]).toContain(`{"data":"C","path":["stream",2],"hasNext":true}`);
});

test('SSE subscription', async () => {
  const { address } = await serverReady;
  const eventSource = new EventSource(`${address}/graphql?query=subscription{ping}`);

  let n = 0;
  const payload = await new Promise<string>(resolve => {
    eventSource.addEventListener('message', (event: any) => {
      switch (++n) {
        case 1:
        case 2:
          return expect(JSON.parse(event.data)).toStrictEqual({
            data: {
              ping: 'pong',
            },
          });
        case 3:
          expect(JSON.parse(event.data)).toStrictEqual({
            data: {
              ping: 'pong',
            },
          });
          return resolve('OK');
        default:
          console.error(event);
          throw Error('Unexpected event');
      }
    });
  });
  eventSource.close();
  expect(payload).toBe('OK');
});

test('getEnveloped', async () => {
  const { envelop } = await serverReady;

  const getEnveloped = await envelop.getEnveloped;
  const { schema } = getEnveloped();
  expect(printSchema(schema)).toMatchInlineSnapshot(`
    "type Query {
      hello: String!
      users: [User!]!
      stream: [String!]!
    }

    type User {
      id: Int!
    }

    type Subscription {
      ping: String!
    }

    \\"\\"\\"
    A date string, such as 2007-12-03, compliant with the \`full-date\` format outlined in section 5.6 of the RFC 3339 profile of the ISO 8601 standard for representation of dates and times using the Gregorian calendar.
    \\"\\"\\"
    scalar Date

    \\"\\"\\"
    A time string at UTC, such as 10:15:30Z, compliant with the \`full-time\` format outlined in section 5.6 of the RFC 3339profile of the ISO 8601 standard for representation of dates and times using the Gregorian calendar.
    \\"\\"\\"
    scalar Time

    \\"\\"\\"
    A date-time string at UTC, such as 2007-12-03T10:15:30Z, compliant with the \`date-time\` format outlined in section 5.6 of the RFC 3339 profile of the ISO 8601 standard for representation of dates and times using the Gregorian calendar.
    \\"\\"\\"
    scalar DateTime

    \\"\\"\\"
    The javascript \`Date\` as integer. Type represents date and time as number of milliseconds from start of UNIX epoch.
    \\"\\"\\"
    scalar Timestamp

    \\"\\"\\"
    A field whose value is a UTC Offset: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
    \\"\\"\\"
    scalar UtcOffset

    \\"\\"\\"

        A string representing a duration conforming to the ISO8601 standard,
        such as: P1W1DT13H23M34S
        P is the duration designator (for period) placed at the start of the duration representation.
        Y is the year designator that follows the value for the number of years.
        M is the month designator that follows the value for the number of months.
        W is the week designator that follows the value for the number of weeks.
        D is the day designator that follows the value for the number of days.
        T is the time designator that precedes the time components of the representation.
        H is the hour designator that follows the value for the number of hours.
        M is the minute designator that follows the value for the number of minutes.
        S is the second designator that follows the value for the number of seconds.

        Note the time designator, T, that precedes the time value.

        Matches moment.js, Luxon and DateFns implementations
        ,/. is valid for decimal places and +/- is a valid prefix
      
    \\"\\"\\"
    scalar Duration

    \\"\\"\\"

        A string representing a duration conforming to the ISO8601 standard,
        such as: P1W1DT13H23M34S
        P is the duration designator (for period) placed at the start of the duration representation.
        Y is the year designator that follows the value for the number of years.
        M is the month designator that follows the value for the number of months.
        W is the week designator that follows the value for the number of weeks.
        D is the day designator that follows the value for the number of days.
        T is the time designator that precedes the time components of the representation.
        H is the hour designator that follows the value for the number of hours.
        M is the minute designator that follows the value for the number of minutes.
        S is the second designator that follows the value for the number of seconds.

        Note the time designator, T, that precedes the time value.

        Matches moment.js, Luxon and DateFns implementations
        ,/. is valid for decimal places and +/- is a valid prefix
      
    \\"\\"\\"
    scalar ISO8601Duration

    \\"\\"\\"
    A local date string (i.e., with no associated timezone) in \`YYYY-MM-DD\` format, e.g. \`2020-01-01\`.
    \\"\\"\\"
    scalar LocalDate

    \\"\\"\\"
    A local time string (i.e., with no associated timezone) in 24-hr \`HH:mm[:ss[.SSS]]\` format, e.g. \`14:25\` or \`14:25:06\` or \`14:25:06.123\`.
    \\"\\"\\"
    scalar LocalTime

    \\"\\"\\"
    A local time string (i.e., with no associated timezone) in 24-hr \`HH:mm[:ss[.SSS]]\` format, e.g. \`14:25\` or \`14:25:06\` or \`14:25:06.123\`.  This scalar is very similar to the \`LocalTime\`, with the only difference being that \`LocalEndTime\` also allows \`24:00\` as a valid value to indicate midnight of the following day.  This is useful when using the scalar to represent the exclusive upper bound of a time block.
    \\"\\"\\"
    scalar LocalEndTime

    \\"\\"\\"
    A field whose value conforms to the standard internet email address format as specified in RFC822: https://www.w3.org/Protocols/rfc822/.
    \\"\\"\\"
    scalar EmailAddress @specifiedBy(url: \\"https://www.w3.org/Protocols/rfc822/\\")

    \\"\\"\\"Floats that will have a value less than 0.\\"\\"\\"
    scalar NegativeFloat

    \\"\\"\\"Integers that will have a value less than 0.\\"\\"\\"
    scalar NegativeInt

    \\"\\"\\"A string that cannot be passed as an empty value\\"\\"\\"
    scalar NonEmptyString

    \\"\\"\\"Floats that will have a value of 0 or more.\\"\\"\\"
    scalar NonNegativeFloat

    \\"\\"\\"Integers that will have a value of 0 or more.\\"\\"\\"
    scalar NonNegativeInt

    \\"\\"\\"Floats that will have a value of 0 or less.\\"\\"\\"
    scalar NonPositiveFloat

    \\"\\"\\"Integers that will have a value of 0 or less.\\"\\"\\"
    scalar NonPositiveInt

    \\"\\"\\"
    A field whose value conforms to the standard E.164 format as specified in: https://en.wikipedia.org/wiki/E.164. Basically this is +17895551234.
    \\"\\"\\"
    scalar PhoneNumber

    \\"\\"\\"Floats that will have a value greater than 0.\\"\\"\\"
    scalar PositiveFloat

    \\"\\"\\"Integers that will have a value greater than 0.\\"\\"\\"
    scalar PositiveInt

    \\"\\"\\"
    A field whose value conforms to the standard postal code formats for United States, United Kingdom, Germany, Canada, France, Italy, Australia, Netherlands, Spain, Denmark, Sweden, Belgium, India, Austria, Portugal, Switzerland or Luxembourg.
    \\"\\"\\"
    scalar PostalCode

    \\"\\"\\"Floats that will have a value of 0 or more.\\"\\"\\"
    scalar UnsignedFloat

    \\"\\"\\"Integers that will have a value of 0 or more.\\"\\"\\"
    scalar UnsignedInt

    \\"\\"\\"
    A field whose value conforms to the standard URL format as specified in RFC3986: https://www.ietf.org/rfc/rfc3986.txt.
    \\"\\"\\"
    scalar URL

    \\"\\"\\"
    The \`BigInt\` scalar type represents non-fractional signed whole numeric values.
    \\"\\"\\"
    scalar BigInt

    \\"\\"\\"
    The \`BigInt\` scalar type represents non-fractional signed whole numeric values.
    \\"\\"\\"
    scalar Long

    \\"\\"\\"The \`Byte\` scalar type represents byte value as a Buffer\\"\\"\\"
    scalar Byte

    \\"\\"\\"
    A field whose value is a generic Universally Unique Identifier: https://en.wikipedia.org/wiki/Universally_unique_identifier.
    \\"\\"\\"
    scalar UUID

    \\"\\"\\"
    A field whose value is a generic Universally Unique Identifier: https://en.wikipedia.org/wiki/Universally_unique_identifier.
    \\"\\"\\"
    scalar GUID

    \\"\\"\\"
    A field whose value is a hexadecimal: https://en.wikipedia.org/wiki/Hexadecimal.
    \\"\\"\\"
    scalar Hexadecimal

    \\"\\"\\"
    A field whose value is a hex color code: https://en.wikipedia.org/wiki/Web_colors.
    \\"\\"\\"
    scalar HexColorCode @specifiedBy(url: \\"https://en.wikipedia.org/wiki/Web_colors\\")

    \\"\\"\\"
    A field whose value is a CSS HSL color: https://developer.mozilla.org/en-US/docs/Web/CSS/color_value#hsl()_and_hsla().
    \\"\\"\\"
    scalar HSL @specifiedBy(url: \\"https://developer.mozilla.org/en-US/docs/Web/CSS/color_value#hsl()_and_hsla()\\")

    \\"\\"\\"
    A field whose value is a CSS HSLA color: https://developer.mozilla.org/en-US/docs/Web/CSS/color_value#hsl()_and_hsla().
    \\"\\"\\"
    scalar HSLA

    \\"\\"\\"
    A field whose value is a IPv4 address: https://en.wikipedia.org/wiki/IPv4.
    \\"\\"\\"
    scalar IPv4

    \\"\\"\\"
    A field whose value is a IPv6 address: https://en.wikipedia.org/wiki/IPv6.
    \\"\\"\\"
    scalar IPv6

    \\"\\"\\"
    A field whose value is a ISBN-10 or ISBN-13 number: https://en.wikipedia.org/wiki/International_Standard_Book_Number.
    \\"\\"\\"
    scalar ISBN

    \\"\\"\\"
    A field whose value is a JSON Web Token (JWT): https://jwt.io/introduction.
    \\"\\"\\"
    scalar JWT

    \\"\\"\\"
    A field whose value is a valid decimal degrees latitude number (53.471): https://en.wikipedia.org/wiki/Latitude
    \\"\\"\\"
    scalar Latitude

    \\"\\"\\"
    A field whose value is a valid decimal degrees longitude number (53.471): https://en.wikipedia.org/wiki/Longitude
    \\"\\"\\"
    scalar Longitude

    \\"\\"\\"
    A field whose value is a IEEE 802 48-bit MAC address: https://en.wikipedia.org/wiki/MAC_address.
    \\"\\"\\"
    scalar MAC

    \\"\\"\\"
    A field whose value is a valid TCP port within the range of 0 to 65535: https://en.wikipedia.org/wiki/Transmission_Control_Protocol#TCP_ports
    \\"\\"\\"
    scalar Port

    \\"\\"\\"
    A field whose value is a CSS RGB color: https://developer.mozilla.org/en-US/docs/Web/CSS/color_value#rgb()_and_rgba().
    \\"\\"\\"
    scalar RGB

    \\"\\"\\"
    A field whose value is a CSS RGBA color: https://developer.mozilla.org/en-US/docs/Web/CSS/color_value#rgb()_and_rgba().
    \\"\\"\\"
    scalar RGBA

    \\"\\"\\"
    The \`SafeInt\` scalar type represents non-fractional signed whole numeric values that are considered safe as defined by the ECMAScript specification.
    \\"\\"\\"
    scalar SafeInt @specifiedBy(url: \\"https://www.ecma-international.org/ecma-262/#sec-number.issafeinteger\\")

    \\"\\"\\"A currency string, such as $21.25\\"\\"\\"
    scalar USCurrency

    \\"\\"\\"
    A field whose value is a Currency: https://en.wikipedia.org/wiki/ISO_4217.
    \\"\\"\\"
    scalar Currency @specifiedBy(url: \\"https://en.wikipedia.org/wiki/ISO_4217\\")

    \\"\\"\\"
    The \`JSON\` scalar type represents JSON values as specified by [ECMA-404](http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf).
    \\"\\"\\"
    scalar JSON @specifiedBy(url: \\"http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf\\")

    \\"\\"\\"
    The \`JSONObject\` scalar type represents JSON objects as specified by [ECMA-404](http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf).
    \\"\\"\\"
    scalar JSONObject @specifiedBy(url: \\"http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf\\")

    \\"\\"\\"
    A field whose value is an International Bank Account Number (IBAN): https://en.wikipedia.org/wiki/International_Bank_Account_Number.
    \\"\\"\\"
    scalar IBAN

    \\"\\"\\"
    A field whose value conforms with the standard mongodb object ID as described here: https://docs.mongodb.com/manual/reference/method/ObjectId/#ObjectId. Example: 5e5677d71bdc2ae76344968c
    \\"\\"\\"
    scalar ObjectID

    \\"\\"\\"Represents NULL values\\"\\"\\"
    scalar Void
    "
  `);
});
