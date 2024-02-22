import { parseArgs } from 'https://deno.land/std@0.217.0/cli/parse_args.ts';
import { dirname, join, normalize } from 'https://deno.land/std@0.217.0/path/mod.ts';
import {
  getLogger,
  LogRecord,
  RotatingFileHandler,
  setup,
} from 'https://deno.land/std@0.217.0/log/mod.ts';

const __args = parseArgs(Deno.args);

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
