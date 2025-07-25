import express, { Request, Response } from "express";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config({ path: "../.env" });

const app = express();
const port: number = 3001;

// Allow express to parse JSON bodies
app.use(express.json());

interface TokenRequest {
  code: string;
}

interface TokenResponse {
  access_token: string;
}

app.post("/api/token", async (req: Request<{}, {}, TokenRequest>, res: Response) => {
  
  // Exchange the code for an access_token
  const response = await fetch(`https://discord.com/api/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: process.env.VITE_DISCORD_CLIENT_ID!,
      client_secret: process.env.DISCORD_CLIENT_SECRET!,
      grant_type: "authorization_code",
      code: req.body.code,
    }),
  });

  // Retrieve the access_token from the response
  const responseData = await response.json() as TokenResponse;
  const { access_token } = responseData;

  // Return the access_token to our client as { access_token: "..."}
  res.send({ access_token });
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
}); 