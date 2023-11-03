# OpenAI Request Manager

This repository is designed to manage requests to the OpenAI API. The code includes methods to handle token and request availability across multiple OpenAI accounts, retrying failed requests and selecting the best account to use based on remaining tokens and request availability. 

## Main Features:

1. **Manage Multiple OpenAI Accounts**: Rotate between different OpenAI accounts based on token consumption and request limits.
2. **Redis Integration**: Uses Redis to store and retrieve token and request data associated with different OpenAI accounts.
3. **Retrying Requests**: If a request fails due to insufficient tokens, the code will wait and then try again using another account or the same account after a delay.
4. **Token Counting**: Uses the `@av-backend/tokenizer` library to count tokens in a request.
5. **Embedding and Chat Creation**: Includes methods to create embeddings and chat completions with OpenAI.

## Dependencies:

- `axios`: Used for HTTP requests to the OpenAI API.


## Important Modules:

### 1. `processRedis(tokens, tokensRem, requestsRem, type, org, redis)`

- Processes and updates token and request availability in Redis.
- Keeps track of tokens and requests consumed by each OpenAI account.

### 2. `determineOpenAIKey(org, redis)`

- Determines which OpenAI account key to use based on the tokens and requests consumed.
- Rotates between accounts to ensure optimal usage.

### 3. `createEmbeddings(data, redis, force = 0, retryCount = numOfOpenAIaccounts)`

- Sends a request to create embeddings with OpenAI.
- Takes care of insufficient token scenarios and retries the request with another account or after a delay.

### 4. `createChat(data, redis, force = 0, retryCount = numOfOpenAIaccounts)`

- Sends a chat completion request to OpenAI.
- Manages tokens and request limits, and retries the request if necessary.

## Setup:

1. **Redis Setup**: Ensure you have Redis up and running and accessible from this code.
2. **OpenAI API Keys**: The `constants.js` should contain the OpenAI API keys stored in the `OPEN_AI_KEYS` object.
3. **Install Dependencies**: Run `npm install` to install required dependencies.
4. **Usage**: Integrate this code into your application as a middleware or utility to manage requests to OpenAI seamlessly.

## Notes:

- Ensure you handle your OpenAI API keys securely.
- Make sure to monitor the usage and ensure it doesn't exceed your budget, as requests to OpenAI can be costly.
- The code uses a hardcoded set of organization keys (`org_1`, `org_2`, `org_3`); you can expand or adjust based on your requirements.

## Contribute:

Feel free to raise issues, send pull requests and contribute to improving this utility!