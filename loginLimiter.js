import { createHmac } from 'node:crypto';

export const LOGIN_LIMITS = Object.freeze({
  emailMaxAttempts: 5,
  ipMaxAttempts: 20,
  windowSeconds: 15 * 60,
});

const minutesText = (seconds) => {
  const minutes = Math.ceil(seconds / 60);
  return minutes <= 1 ? '1 minute' : `${minutes} minutes`;
};

const lockedResponse = (res, seconds) => {
  res.set('Retry-After', String(seconds));
  return res.status(429).json({
    success: false,
    locked: true,
    retryAfterSeconds: seconds,
    message: `Too many failed sign-in attempts. Try again in ${minutesText(seconds)}, or reset your password.`,
  });
};

export function createLoginHandler({ supabase, createAuthClient, secret, limits = LOGIN_LIMITS }) {
  const keyFor = (kind, value) => `${kind}:${createHmac('sha256', secret).update(String(value)).digest('hex')}`;

  const recordFailure = async (key, maxAttempts) => {
    const { data, error } = await supabase.rpc('record_login_failure', {
      p_key: key, p_max_attempts: maxAttempts, p_window_seconds: limits.windowSeconds,
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    return { attemptsLeft: row?.attempts_left ?? 0, lockedSeconds: row?.locked_seconds ?? 0 };
  };

  return async function loginHandler(req, res) {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Enter your email and password.' });
    }

    const emailKey = keyFor('email', email);
    const ipKey = keyFor('ip', req.ip || 'unknown');

    try {
      const { data: remaining, error: statusError } = await supabase.rpc('login_lock_remaining', { p_keys: [emailKey, ipKey] });
      if (statusError) throw statusError;
      if (Number(remaining) > 0) return lockedResponse(res, Number(remaining));

      const { data, error: signInError } = await createAuthClient().auth.signInWithPassword({ email, password });

      if (signInError) {
        const wrongCredentials = signInError.code === 'invalid_credentials' || /invalid login credentials/i.test(signInError.message || '');
        if (!wrongCredentials) return res.status(400).json({ success: false, message: signInError.message });

        const [byEmail, byIp] = await Promise.all([
          recordFailure(emailKey, limits.emailMaxAttempts),
          recordFailure(ipKey, limits.ipMaxAttempts),
        ]);
        const lockedSeconds = Math.max(byEmail.lockedSeconds, byIp.lockedSeconds);
        if (lockedSeconds > 0) return lockedResponse(res, lockedSeconds);

        const left = byEmail.attemptsLeft;
        return res.status(401).json({
          success: false,
          attemptsLeft: left,
          message: left <= 2
            ? `Incorrect email or password. ${left} ${left === 1 ? 'attempt' : 'attempts'} left before a short pause.`
            : 'Incorrect email or password.',
        });
      }

      await supabase.rpc('clear_login_failures', { p_key: emailKey });
      const { session, user } = data;
      return res.json({
        success: true,
        data: {
          user,
          session: {
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            expires_at: session.expires_at,
          },
        },
      });
    } catch (error) {
      console.error('Login Error (has the login_attempt_limits migration been run?):', error?.message || error);
      return res.status(503).json({ success: false, message: 'Sign-in is temporarily unavailable. Please try again shortly.' });
    }
  };
}
