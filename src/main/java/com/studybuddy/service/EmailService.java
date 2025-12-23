package com.studybuddy.service;

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

    @Value("${app.frontend.url:http://localhost:3000}")
    private String frontendUrl;

    /**
     * Sends email verification email to user
     * @param toEmail Recipient email address
     * @param verificationToken The verification token
     */
    public void sendVerificationEmail(String toEmail, String verificationToken) {
        try {
            String verificationLink = frontendUrl + "/verify-email?token=" + verificationToken;
            
            String subject = "Verify your StudyBuddy account";
            String htmlContent = buildVerificationEmailHtml(verificationLink);

            sendHtmlEmail(toEmail, subject, htmlContent);
            logger.info("Verification email sent to: {}", toEmail);
        } catch (Exception e) {
            logger.error("Failed to send verification email to {}: {}", toEmail, e.getMessage());
            throw new RuntimeException("Failed to send verification email", e);
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
