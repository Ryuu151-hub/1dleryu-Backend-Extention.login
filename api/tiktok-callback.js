export default async function handler(req, res) {
  const { code, state, error } = req.query;

  if (error) {
    return res.status(400).send(`Authorization failed: ${error}`);
  }

  if (!code) {
    return res.status(400).send('Missing authorization code');
  }

  try {
    // Exchange the authorization code for access/refresh tokens
    const tokenResponse = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cache-Control': 'no-cache',
      },
      body: new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY,
        client_secret: process.env.TIKTOK_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.TIKTOK_REDIRECT_URI,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      return res.status(400).send(`Token exchange failed: ${tokenData.error_description || tokenData.error}`);
    }

    // tokenData contains: access_token, refresh_token, expires_in, open_id, scope, etc.
    // TODO: store tokenData securely (e.g. a database keyed by state or open_id)

    // Send a simple page back that posts the result to the extension via window.opener
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(`
      <html>
        <body>
          <script>
            window.opener.postMessage({
              type: 'tiktok-auth-success',
              accessToken: '${tokenData.access_token}',
              openId: '${tokenData.open_id}'
            }, '*');
            window.close();
          </script>
          <p>Login successful. You can close this window.</p>
        </body>
      </html>
    `);
  } catch (err) {
    console.error(err);
    return res.status(500).send('Server error during token exchange');
  }
}
