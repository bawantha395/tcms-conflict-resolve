# WhatsApp Setup for Teacher Credentials

This document explains how to set up WhatsApp messaging for sending teacher login credentials.

## Overview

When a new teacher account is created, the system automatically sends a WhatsApp message containing:
- Teacher ID
- Password
- Login URL
- Security instructions

## Setup Options

### Option 1: Twilio WhatsApp (Recommended - Easier Setup)

1. **Sign up for Twilio**: Go to [twilio.com](https://www.twilio.com) and create an account
2. **Get WhatsApp Sandbox**: 
   - Go to Twilio Console > Messaging > Try it out > Send a WhatsApp message
   - Follow the instructions to join your sandbox
3. **Get Credentials**:
   - Account SID (found in Twilio Console)
   - Auth Token (found in Twilio Console)
   - WhatsApp From number (format: `whatsapp:+1234567890`)

4. **Configure Environment Variables**:
   ```bash
   TWILIO_ACCOUNT_SID=your_account_sid_here
   TWILIO_AUTH_TOKEN=your_auth_token_here
   TWILIO_WHATSAPP_FROM=whatsapp:+your_twilio_whatsapp_number
   ```

### Option 2: WhatsApp Business API (Advanced Setup)

1. **Create Meta Developer Account**: Go to [developers.facebook.com](https://developers.facebook.com)
2. **Create WhatsApp Business App**:
   - Create a new app
   - Add WhatsApp product
   - Configure phone number
3. **Get Credentials**:
   - Access Token
   - Phone Number ID
   - Business Account ID

4. **Configure Environment Variables**:
   ```bash
   WHATSAPP_ACCESS_TOKEN=your_access_token_here
   WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
   WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id_here
   ```

## Installation

1. **Install Dependencies**:
   ```bash
   cd backend/teacher/src
   composer install
   ```

2. **Configure Environment**:
   - Copy the environment variables to your `.env` file or server configuration
   - Make sure the WhatsApp service is enabled in `whatsapp_config.php`

## Testing

1. **Create a Test Teacher Account**:
   - Go to Admin Dashboard > Teachers > Create Teacher Login
   - Fill in the form with a valid phone number
   - Submit the form

2. **Check WhatsApp**:
   - The teacher should receive a WhatsApp message with login credentials
   - Check the admin interface for WhatsApp status

## Troubleshooting

### Common Issues

1. **"Twilio client not initialized"**:
   - Check that your Twilio credentials are correct
   - Verify that the environment variables are set

2. **"WhatsApp API error"**:
   - Check your Meta Developer Console for API errors
   - Verify phone number format (should be international format)

3. **"cURL Error"**:
   - Check your server's internet connection
   - Verify that cURL is enabled in PHP

### Debug Mode

To enable debug mode, add this to your environment:
```bash
WHATSAPP_DEBUG=true
```

This will log detailed error messages to help troubleshoot issues.

## Security Notes

- Never commit real API credentials to version control
- Use environment variables for all sensitive data
- Regularly rotate your API tokens
- Monitor your WhatsApp API usage to avoid rate limits

## Message Format

The WhatsApp message includes:
```
🎓 TCMS Teacher Account Created

Dear [Teacher Name],

Your teacher account has been successfully created.

📋 Login Credentials:
• Teacher ID: [ID]
• Password: [Password]

🔐 Security Note:
Please change your password after your first login for security.

🌐 Login URL:
http://localhost:3000/login

If you have any questions, please contact the administrator.

Best regards,
TCMS Team
``` 