import { parse } from 'https://deno.land/std@0.159.0/flags/mod.ts';
import { dirname, join, normalize } from 'https://deno.land/std@0.159.0/path/mod.ts';
import { getLogger, LogRecord, setup } from 'https://deno.land/std@0.159.0/log/mod.ts';
import { RotatingFileHandler } from 'https://deno.land/std@0.159.0/log/handlers.ts';

const __args = parse(Deno.args);

const logfile = __args['logfile']
  ? normalize(__args['logfile'])
  : join(dirname(new URL(import.meta.url).pathname), '../../peek.log');

function formatter(logRecord: LogRecord) {
  const { levelName, msg, args, datetime } = logRecord;

  const timestamp = datetime.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    fractionalSecondDigits: 3,
  });

  const pid = Deno.pid.toString().padEnd(8, ' ');

  return `${levelName.padEnd(9, ' ')} ${pid} ${timestamp}  ${msg} ${args.join(' ')}`;
}

function setupLogger() {
  setup({
    handlers: {
      file: new RotatingFileHandler('INFO', {
        filename: logfile,
        formatter,
        maxBytes: 1_000_000,
        maxBackupCount: 1,
      }),
    },
    loggers: {
      file: {
        level: 'INFO',
        handlers: ['file'],
      },
    },
  });

  return getLogger('file');
}

function get() {
  return getLogger('file');
}

export default { setupLogger, get };
