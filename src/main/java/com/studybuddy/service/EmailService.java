package com.studybuddy.service;

import jakarta.annotation.PostConstruct;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

/**
 * Service for sending emails using SendGrid via JavaMailSender
 */
@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    @Autowired
    private JavaMailSender mailSender;

    @Value("${spring.mail.from:noreply@studybuddy.com}")
    private String fromEmail;

    @Value("${spring.mail.password:your-sendgrid-api-key}")
    private String mailPassword;

    @Value("${app.frontend.url:http://localhost:3000}")
    private String frontendUrl;

    /**
     * Logs email configuration on startup (without exposing sensitive data)
     */
    @PostConstruct
    public void logEmailConfiguration() {
        // Check environment variables directly
        String envApiKey = System.getenv("SENDGRID_API_KEY");
        String envFromAddress = System.getenv("MAIL_FROM_ADDRESS");
        String envFrontendUrl = System.getenv("FRONTEND_URL");
        
        boolean isConfigured = mailPassword != null && 
                               !mailPassword.isEmpty() && 
                               !mailPassword.equals("your-sendgrid-api-key");
        
        logger.info("========================================");
        logger.info("EMAIL SERVICE CONFIGURATION");
        logger.info("From Address (config): {}", fromEmail);
        logger.info("From Address (env var): {}", envFromAddress != null ? envFromAddress : "NOT SET");
        logger.info("Frontend URL (config): {}", frontendUrl);
        logger.info("Frontend URL (env var): {}", envFrontendUrl != null ? envFrontendUrl : "NOT SET");
        logger.info("SendGrid API Key (config): {}", isConfigured ? "✅ CONFIGURED" : "❌ NOT CONFIGURED");
        logger.info("SendGrid API Key (env var): {}", envApiKey != null && !envApiKey.isEmpty() ? "✅ SET" : "❌ NOT SET");
        
        if (envApiKey != null && !envApiKey.isEmpty() && !isConfigured) {
            logger.warn("⚠️  WARNING: Environment variable SENDGRID_API_KEY is set but not being read!");
            logger.warn("⚠️  Please restart the backend server to load environment variables.");
        }
        
        if (isConfigured) {
            logger.info("Email sending: ENABLED (emails will be sent via SendGrid)");
        } else {
            logger.warn("Email sending: DISABLED (verification links will be logged to console)");
            logger.warn("To enable: Set SENDGRID_API_KEY environment variable and restart server");
        }
        logger.info("========================================");
    }

    /**
     * Sends email verification email to user
     * @param toEmail Recipient email address
     * @param verificationToken The verification token
     */
    public void sendVerificationEmail(String toEmail, String verificationToken) {
        String verificationLink = frontendUrl + "/verify-email?token=" + verificationToken;
        
        // Check if SendGrid is properly configured
        boolean isDevelopmentMode = mailPassword == null || 
                                    mailPassword.isEmpty() || 
                                    mailPassword.equals("your-sendgrid-api-key");
        
        // Always log verification link for debugging (even in production)
        logger.info("========================================");
        logger.info("EMAIL VERIFICATION REQUEST");
        logger.info("To: {}", toEmail);
        logger.info("Verification Link: {}", verificationLink);
        if (isDevelopmentMode) {
            logger.warn("⚠️  DEVELOPMENT MODE: Email will not be sent");
            logger.warn("Copy the link above to verify the account manually");
        } else {
            logger.info("📧 Email will be sent via SendGrid");
        }
        logger.info("========================================");
        
        try {
            String subject = "Verify your StudyBuddy account";
            String htmlContent = buildVerificationEmailHtml(verificationLink);

            sendHtmlEmail(toEmail, subject, htmlContent);
            logger.info("✅ Verification email sent successfully to: {}", toEmail);
        } catch (Exception e) {
            logger.error("❌ Failed to send verification email to {}: {}", toEmail, e.getMessage(), e);
            
            // Log detailed error information
            logger.error("========================================");
            logger.error("EMAIL SENDING FAILED - DETAILED ERROR");
            logger.error("Email: {}", toEmail);
            logger.error("From: {}", fromEmail);
            logger.error("Error Type: {}", e.getClass().getSimpleName());
            logger.error("Error Message: {}", e.getMessage());
            
            // Check for common SendGrid errors
            if (e.getMessage() != null) {
                String errorMsg = e.getMessage().toLowerCase();
                if (errorMsg.contains("authentication") || errorMsg.contains("535")) {
                    logger.error("⚠️  AUTHENTICATION ERROR: Check if SENDGRID_API_KEY is correct");
                } else if (errorMsg.contains("sender") || errorMsg.contains("from")) {
                    logger.error("⚠️  SENDER ERROR: Check if studybuddy.team@outlook.co.il is verified in SendGrid");
                } else if (errorMsg.contains("connection") || errorMsg.contains("timeout")) {
                    logger.error("⚠️  CONNECTION ERROR: Check network/firewall settings");
                }
            }
            
            if (e.getCause() != null) {
                logger.error("Root Cause: {}", e.getCause().getMessage());
            }
            
            // Always log the verification link
            logger.error("Verification link: {}", verificationLink);
            logger.error("Copy the link above to verify the account manually");
            logger.error("========================================");
            
            throw new RuntimeException("Failed to send verification email: " + e.getMessage(), e);
        }
    }

    /**
     * Sends a generic HTML email
     */
    private void sendHtmlEmail(String to, String subject, String htmlContent) throws MessagingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
        
        helper.setFrom(fromEmail);
        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(htmlContent, true);
        
        mailSender.send(message);
    }

    /**
     * Builds HTML content for verification email
     */
    private String buildVerificationEmailHtml(String verificationLink) {
        return "<!DOCTYPE html>" +
                "<html>" +
                "<head>" +
                "  <meta charset='UTF-8'>" +
                "  <style>" +
                "    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }" +
                "    .container { max-width: 600px; margin: 0 auto; padding: 20px; }" +
                "    .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }" +
                "    .content { background-color: #f9f9f9; padding: 30px; }" +
                "    .button { display: inline-block; padding: 12px 24px; background-color: #4CAF50; " +
                "              color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }" +
                "    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }" +
                "  </style>" +
                "</head>" +
                "<body>" +
                "  <div class='container'>" +
                "    <div class='header'>" +
                "      <h1>Welcome to StudyBuddy!</h1>" +
                "    </div>" +
                "    <div class='content'>" +
                "      <h2>Verify Your Email Address</h2>" +
                "      <p>Thank you for registering with StudyBuddy. To complete your registration and " +
                "         start collaborating with fellow students, please verify your email address.</p>" +
                "      <p style='text-align: center;'>" +
                "        <a href='" + verificationLink + "' class='button'>Verify Email</a>" +
                "      </p>" +
                "      <p>Or copy and paste this link into your browser:</p>" +
                "      <p style='word-break: break-all; background-color: #eee; padding: 10px;'>" +
                verificationLink + "</p>" +
                "      <p><strong>This link will expire in 24 hours.</strong></p>" +
                "      <p>If you didn't create an account with StudyBuddy, please ignore this email.</p>" +
                "    </div>" +
                "    <div class='footer'>" +
                "      <p>&copy; 2025 StudyBuddy. All rights reserved.</p>" +
                "    </div>" +
                "  </div>" +
                "</body>" +
                "</html>";
    }
}
