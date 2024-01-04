# Overview 

StakePad Server provides a set of endpoints to manage user authentication, company registration, role assignment, and more. Below are the available endpoints along with a brief description of their functionality.


# Environment Variables

Please copy or rename .env.example to .env and fill in all environment variables : `cp .env.example .env`

- ```ADMIN_EMAIL``` : email StakePad will choose to connect as ADMIN. 
- ```ADMIN_NAME```: Name of the Admin will be stored in the database. 
- ```ADMIN_PASSWORD``` : Password of the StakePad admin account to connect to the platform. 
- ```PROFILE_PICTURE_PATH``` : <Optional> - Profil picture for the ADMIN account. This image can be displayed on dashboard. 
- ```RPC_URL_GOERLI``` :  This is the URL for the Goerli network.  
- ```STAKEPAD_CONTRACT_ADDRESS``` : Ethereum address of the StakePad's main smart contract
- ```FRONTEND_URL``` :  
- ```DEFAULT_COMPANY_NAME``` : Assigned by StakePad 
- ```DEFAULT_COMPANY_LOCATION``` : Assigned by StakePad 
- ```DEFAULT_COMPANY_WEBSITE``` : Assigned by StakePad 
- ```DEFAULT_COMPANY_WALLET_ADDRESS``` : Assigned by StakePad 


## Testing ( 3 terminals )

1. run `docker compose up`
2. run `yarn dev`
3. run `yarn test`

### Run server

- `npm install`
- `npm dev`

### Run server PRODUCTION

- `npm install`
- `npm run build`
- `npm run start`

### Nodemailer configuration (TESTING)

use at your own risk, for production please use your own email provider SMTP.

1. Go to https://ethereal.email/
2. Create Ethereal account
3. fill in details in the `.env`



# Endpoints  

## Authorization endpoints 

#### Sign up 

- Description: Create a new user account.
- Endpoint: `POST auth/signup`
- Request Body:
  ```json
  {
    "email": "example@gmail.com",
    "name": "Example",
    "password": "your_password", // follow password minimum requirements
    "repeatPassword": "your_password"
  }
  ```
- Response: `201 User created successfully. Please verify your email.`

  - **After you sign up connect here : https://ethereal.email/ to click on the link to validate your email**

#### Email Verification 

- Description: Verify user's email address using a verification token.
- Endpoint: `GET auth/verify-email?token=verification_token`
- Response: `200 Email verified successfully.`

  ```json
  {
    "message": "200 Email verified successfully.,
  }
  ```

#### Login 

- Description: Authenticate an existing user and get an access token.

- Endpoint: `POST auth/login`
- Request Body:
  
  ```json
  {
    "email": "example@gmail.com",
    "password": "your_password"
  }
  ```
- Response: 
  
  ```json
  {
    "message": "Logged in successfully",
    "roles": ["ADMIN"]
  }
  ```


#### Logout 

- Description : Loging out from an account. 
- Endpoint: `POST auth/logout`
- Response: `200`
  ```json
  {
    "message": "Logged out successfully",
    "roles": ["ADMIN"]
  }
  ```

#### Password recovery request 

- Description: Send a password reset email to the user.
- Endpoint: `POST auth/forgot-password`
- Request Body:
  ```json
  {
    "email": "example@example.com"
  }
  ```
- Response: `200 OK`
  ```json
  {
    "message": "Password reset email sent."
  }
  ```

#### Password recovery 

- Description: Reset the user's password using a reset token.
- Endpoint: `POST auth/reset-password`
- Request Body:
  
  ```json
  {
    "token": "reset_token",
    "newPassword": "new_password",
    "confirmNewPassword": "new_password"
  }
  ```
- Response: `200 OK`
  
  ```json
  {
    "message": "Password reset successfully."
  }
  ```


## Company Management

#### Add Company 

- Description: This endpoint allows authorized users to add a new company. Users must have either 'STAFF' or 'ADMIN' roles to successfully perform this action.
- Endpoint: `POST /management/add-company`
- Authorization :     
  - **Type:** JWT Token
  - **Roles:** `STAFF`, `ADMIN`
- Request body:
  
  ```json
  {
  "name" : <COMPANY_NAME>
  "location" : <COMPANY_LOCATION>
  "website" : <COMPANY_URL_WEBSITE>
  "walletAddress" : <COMPANY_WALLET_ADDRESS> - EVM ADDRESS 
  "slack" : <OPTIONAL> 
  "rewardVault" : <OPTIONAL> - EVM ADDRESS 
  }
  

#### Edit Company 

- Description: allows authorized users to edit an existing company's details in the database. Users must have either 'STAFF' or 'ADMIN' roles to successfully perform this action.
- Endpoint: `PUT /management/edit-company/:id`
- Authorization:
    - **Type:** JWT Token
    - **Roles:** `STAFF`, `ADMIN`
- Request body:
  
  ```json
  {
  "name" : <COMPANY_NAME>
  "location" : <COMPANY_LOCATION>
  "website" : <COMPANY_URL_WEBSITE>
  "walletAddress" : <COMPANY_WALLET_ADDRESS> - EVM ADDRESS 
  "slack" : <OPTIONAL> 
  "rewardVault" : <OPTIONAL> - EVM ADDRESS 
  }
  ```

####  Assign Role 

- Description: allows authorized users to assign roles to other users. Only 'ADMIN' and 'STAFF' roles can use this endpoint to assign roles.
- Endpoint: `POST /management/assign-roles`
- Authorization: 
  - **Type:** JWT Token
  - **Roles:** `ADMIN`, `STAFF`
- Request Body: 

```json
{
  "roleToAssignId": "Role ID", // ADMIN = 1 ; STAFF = 2 ; CLIENT = 3
  "userToAssignId": "User ID"
}
```


#### Generate Link 

- Description: Generates a link. 
- Endpoint: `POST management/generate-link`
- Request body: 
```json
{
  "validators": [
    {
      "pubkey": "example_pubkey_1",
      "withdrawalcredentials": "example_withdrawal_credentials_1",
      "signature": "example_signature_1",
      "depositDataRoot": "example_deposit_data_root_1"
    }
  ],
  "client": "0x123"
}
```
- Response Body: 
```json
{
  "message": "Link generated successfully",
  "linkToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJsaW5rSWQiOjE5LCJpYXQiOjE2OTM5MzUzNTB9.QDBbeyEKPF3TRQohTwRdj6ZOx2c2exQRRIfLLzPeIvY"
}
```


#### Update Reward Vault 

- Description: Update the reward vault address. 
- Endpoint: `POST management/reward-vault`
- Authorization : 
  - **Type:** JWT Token
  - **Roles:** `ADMIN`, `STAFF`
- Request body:  

```json
{
  "companyId": 1,
  "rewardVault": "0x2"
}
```
- Response body: 

```json
{
  "message": "Reward vault updated successfully.",
  "updatedCompany": {
    "id": 1,
    "name": "GlobalStake",
    "location": "USA",
    "website": "https://globalstake.com",
    "walletAddress": "0x14299C00861767244D552B206dd9217EafA0196b",
    "slack": "",
    "rewardVault": "0x029120321381413"
  }
}
```

#### Remove company

- Description: Removes a company from database.
- Endpoint: `DELETE management/remove-company/:id`
- Authorization: 
  - **Type:** JWT Token
  - **Roles:** `ADMIN`, `STAFF`
- Response Body:
  ```json
  {
  "Company removed successfully."
  }
  ``` 

#### Assigning user to a company 

- Description: Assigns a user to a company. 
- Endpoint: ` POST management/assignCompany`
- Authorization: 
  - **Type:** JWT Token
  - **Roles:** `ADMIN`, `STAFF`
- Request body: 
```json
{
  "userToAssignId": "11",
  "companyId": "2"
}
```

#### Remove user 

- Description: Remove a user from database based on his ID. 
- Endpoint: `DELETE management/remove-user/:id`
- Authorization: 
  - **Type:** JWT Token
  - **Roles:** `ADMIN`, `STAFF`
- Response body:

  ```json
  {
    "message": "User removed successfully."
  }
  ```

#### Delete Private Link 

- Description: Deletes a Private Link. 
- Endpoint:  `DELETE /delete-privatelink/:id
- - Authorization: 
  - **Type:** JWT Token
  - **Roles:** `ADMIN`, `STAFF`
- Response body :
  ```json{ "PrivateLink deleted successfully." } ``` 

## Infos Endpoints 

#### GET company info 

- Description: Gets a company information based on it's id 
- Endpoint: `GET infos/company/:id`
- Response body: 

```json
{
  "id": 2,
  "name": "Aave",
  "location": "Japan",
  "website": "https://aave.com",
  "walletAddress": "0x14299C00861767244D552B206dd9217EafA0196b",
  "slack": "",
  "rewardVault": "0x029120321381413"
}
```

#### GET companies list 

- Description: Fetches the list of existing companies. 
- Endpoint: `GET /infos/companies/details`
- Authorization :
  - **Type:** JWT Token
  - **Roles:** `ADMIN`, `STAFF`
- Request:

```json
curl -X GET -H "Authorization: Bearer <YOUR_TOKEN>" http://localhost:3001/infos/companies/details 
```
- Response body:

```json{

  [
    {
        "id": 12,
        "name": "Google",
        "location": "San Francisco, CA",
        "website": "https://www.myawesomecompany.com",
        "walletAddress": "0xF99aF52Ab7bbd7535797538946aBa7958a2DAD8c",
        "slack": null,
        "rewardVault": "0xF99aF52Ab7bbd7535797538946aBa7958a2DAD8c"
    },
    {
        "id": 13,
        "name": "Lebanon",
        "location": "San Francisco, CA",
        "website": "https://www.myawesomecompany.com",
        "walletAddress": "0xF99aF52Ab7bbd7535797538946aBa7958a2DAD8c",
        "slack": null,
        "rewardVault": "0xF99aF52Ab7bbd7535797538946aBa7958a2DAD8c"
    }
]

}
```

#### GET List of Users 

- Description: 
- Endpoint: `GET infos/users`
- Authorization: 
  - **Type:** JWT Token
  - **Roles:** `ADMIN`, `STAFF`
- Request: 

```json
curl -X GET -H "Authorization: Bearer <YOUR_TOKEN>" http://localhost:3001/infos/users

```

#### GET current user 

- Description: allows the front-end to retrieve the current logged-in user's details. 
- Endpoint: `GET /infos/getCurrentUser`
- Response: 

```json
{
  "email": "string",
  "role": "string"
}
```

#### GET companies names 

- Description: Retrieves companies ids and names. 
- Endpoint: `GET infos/companies/names`
- Request: 
  
```json
curl -X GET http://localhost:3001/infos/companiesName
```

#### GET Link  

- Description: Retrieves Link Data
- Endpoint: `GET infos/getLink`
- Response body: 
```json
{
  "message": "Link data retrieved successfully",
  "linkData": {
    // Your link data here
  }
}
```


