import net from 'node:net';
import tls from 'node:tls';

const DEFAULT_TIMEOUT_MS = 15000;

export function isEmailConfigured(env = process.env) {
  return Boolean(env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASS && env.MAIL_FROM);
}

export function buildPasswordResetLink(token, email) {
  const origin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
  const url = new URL('/forgot-password', origin);
  url.searchParams.set('token', token);
  if (email) url.searchParams.set('email', email);
  return url.toString();
}

export async function sendPasswordResetEmail({ to, name, resetLink }) {
  if (!isEmailConfigured()) {
    const error = new Error('Email delivery is not configured. Add SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and MAIL_FROM to backend/.env.');
    error.status = 503;
    throw error;
  }

  const appName = process.env.MAIL_APP_NAME || 'Extensio.ai';
  const subject = `${appName} password reset link`;
  const text = [
    `Hi ${name || 'there'},`,
    '',
    `Use this secure link to reset your ${appName} password:`,
    resetLink,
    '',
    'This link expires in 30 minutes. If you did not request it, you can ignore this email.',
    '',
    `${appName} Security`,
  ].join('\n');
  const html = `<!doctype html>
<html>
  <body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:32px 16px">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #dbe4ef;border-radius:18px;overflow:hidden">
            <tr>
              <td style="padding:28px">
                <p style="margin:0 0 10px;color:#00a878;font-weight:700;letter-spacing:.12em;text-transform:uppercase;font-size:12px">${appName}</p>
                <h1 style="margin:0 0 12px;font-size:28px;line-height:1.2;color:#0f172a">Reset your password</h1>
                <p style="margin:0 0 20px;color:#475569;font-size:15px;line-height:1.6">Hi ${escapeHtml(name || 'there')}, we received a request to reset your password. This link expires in 30 minutes.</p>
                <a href="${escapeHtml(resetLink)}" style="display:inline-block;background:#10d6a3;color:#03120e;text-decoration:none;font-weight:700;border-radius:12px;padding:14px 20px">Reset password</a>
                <p style="margin:22px 0 0;color:#64748b;font-size:13px;line-height:1.6">If the button does not work, copy and paste this link into your browser:</p>
                <p style="word-break:break-all;color:#0f766e;font-size:13px;line-height:1.6">${escapeHtml(resetLink)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  await sendSmtpMail({
    from: process.env.MAIL_FROM,
    to,
    subject,
    text,
    html,
  });
}

async function sendSmtpMail({ from, to, subject, text, html }) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || port === 465;
  const username = process.env.SMTP_USER;
  const password = process.env.SMTP_PASS;
  const clientName = process.env.SMTP_CLIENT_NAME || 'localhost';
  const socket = secure
    ? tls.connect({ host, port, servername: host, timeout: DEFAULT_TIMEOUT_MS })
    : net.connect({ host, port, timeout: DEFAULT_TIMEOUT_MS });
  const client = new SmtpClient(socket);

  try {
    await client.expect(220);
    await client.command(`EHLO ${clientName}`, 250);
    if (!secure) {
      await client.command('STARTTLS', 220);
      client.upgradeToTls(host);
      await client.command(`EHLO ${clientName}`, 250);
    }
    await client.command(`AUTH PLAIN ${Buffer.from(`\0${username}\0${password}`).toString('base64')}`, 235);
    await client.command(`MAIL FROM:<${extractEmail(from)}>`, 250);
    await client.command(`RCPT TO:<${extractEmail(to)}>`, [250, 251]);
    await client.command('DATA', 354);
    await client.writeData(buildMessage({ from, to, subject, text, html }));
    await client.expect(250);
    await client.command('QUIT', 221);
  } finally {
    client.close();
  }
}

function buildMessage({ from, to, subject, text, html }) {
  const boundary = `extensio-${Date.now().toString(36)}`;
  return [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodeHeader(subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    text,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    html,
    '',
    `--${boundary}--`,
    '',
    '.',
    '',
  ].join('\r\n');
}

function encodeHeader(value) {
  return /[^\x00-\x7F]/.test(value)
    ? `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`
    : value;
}

function extractEmail(value) {
  const match = String(value).match(/<([^>]+)>/);
  return match ? match[1] : String(value).trim();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

class SmtpClient {
  constructor(socket) {
    this.socket = socket;
    this.buffer = '';
    this.waiters = [];
    this.socket.setEncoding('utf8');
    this.socket.on('data', chunk => this.handleData(chunk));
    this.socket.on('error', error => this.rejectAll(error));
    this.socket.on('timeout', () => this.rejectAll(new Error('SMTP connection timed out')));
  }

  upgradeToTls(host) {
    this.socket.removeAllListeners('data');
    this.socket.removeAllListeners('error');
    this.socket = tls.connect({ socket: this.socket, servername: host });
    this.socket.setEncoding('utf8');
    this.socket.on('data', chunk => this.handleData(chunk));
    this.socket.on('error', error => this.rejectAll(error));
  }

  async command(command, expectedCodes) {
    this.socket.write(`${command}\r\n`);
    return this.expect(expectedCodes);
  }

  async writeData(data) {
    this.socket.write(data);
  }

  expect(expectedCodes) {
    const codes = Array.isArray(expectedCodes) ? expectedCodes : [expectedCodes];
    return new Promise((resolve, reject) => {
      this.waiters.push({ codes, resolve, reject });
      this.flush();
    });
  }

  close() {
    this.socket.destroy();
  }

  handleData(chunk) {
    this.buffer += chunk;
    this.flush();
  }

  flush() {
    if (!this.waiters.length) return;
    const response = readSmtpResponse(this.buffer);
    if (!response) return;
    this.buffer = this.buffer.slice(response.length);
    const waiter = this.waiters.shift();
    if (waiter.codes.includes(response.code)) waiter.resolve(response.text);
    else waiter.reject(new Error(`SMTP error ${response.code}: ${response.text}`));
  }

  rejectAll(error) {
    while (this.waiters.length) this.waiters.shift().reject(error);
  }
}

function readSmtpResponse(buffer) {
  const lines = buffer.split(/\r?\n/);
  let consumed = 0;
  let lastLine = null;
  for (const line of lines) {
    if (!line) break;
    consumed += line.length + 2;
    if (/^\d{3} /.test(line)) {
      lastLine = line;
      break;
    }
  }
  if (!lastLine) return null;
  return {
    code: Number(lastLine.slice(0, 3)),
    text: buffer.slice(0, consumed).trim(),
    length: consumed,
  };
}
