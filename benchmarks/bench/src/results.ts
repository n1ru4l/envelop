import chalk from 'chalk';
import Table from 'cli-table';
import { promises } from 'fs';
import mkdirp from 'mkdirp';
import { dirname, resolve } from 'path';
import si from 'systeminformation';

const table = new Table({
  chars: {},
  head: ['Server', 'Requests/s', 'Latency', 'Throughput/Mb'],
});

const dataArray: any[] = [];

(async () => {
  const cpuData = si.cpu();
  const osData = si.osInfo();

  let files = await promises.readdir(resolve(__dirname, '../raw_results/')).then(data => {
    return data
      .filter(file => file.match(/(.+)\.json$/))
      .sort()
      .map(choice => choice.replace('.json', ''));
  });

  await Promise.all(
    files.map(async file => {
      const content = await promises.readFile(resolve(__dirname, `../raw_results/${file}.json`));
      dataArray.push(JSON.parse(content.toString()));
    })
  );
  dataArray.sort((a, b) => parseFloat(b.requests.mean) - parseFloat(a.requests.mean));

  const bold = (writeBold: boolean, str: string) => (writeBold ? chalk.bold(str) : str);

  let finish: string;
  dataArray.forEach((data, i) => {
    if (i === 0) {
      console.log(`duration: ${data.duration}s\nconnections: ${data.connections}\npipelining: ${data.pipelining}`);
      console.log('');
    }
    if (data.finish && (!finish || (finish && data.finish > finish))) {
      finish = data.finish;
    }
    const beBold = true;
    table.push([
      bold(beBold, chalk.blue(data.title)),
      bold(beBold, data.requests.average.toFixed(1)),
      bold(beBold, data.latency.average.toFixed(2)),
      bold(beBold, (data.throughput.average / 1024 / 1024).toFixed(2)),
    ]);
  });

  const tableString = table.toString();

  console.log(tableString);

  await cpuData.then(async data => {
    const fileName = `Node_${process.version}_${(await osData).distro}_${data.manufacturer}_${data.brand}_${finish}`
      .replace(/ /g, '_')
      .replace(/:|\./g, '_');

    const targetPath = resolve(__dirname, '../results/' + fileName + '.md');
    await mkdirp(dirname(targetPath));
    await promises.writeFile(targetPath, '# ' + fileName + '\n\n```\n' + tableString.replace(/\u001b[^m]*?m/g, '') + '\n```\n', {
      encoding: 'utf-8',
    });
    console.log('Results summary written to: ' + targetPath);
  });
})().catch(console.error);
