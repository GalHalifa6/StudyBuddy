package com.studybuddy.common.config;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Configuration;

/**
 * Mail configuration to handle SSL certificate validation issues
 * This sets system properties that Jakarta Mail uses to handle SSL connections
 * to SendGrid SMTP servers, especially in environments with certificate validation issues
 */
@Configuration
public class MailConfig {

    private static final Logger logger = LoggerFactory.getLogger(MailConfig.class);

    @PostConstruct
    public void configureMailSSL() {
        // Disable strict server identity checking for SSL connections
        // This is needed when Java's truststore doesn't trust SendGrid's certificate chain
        // Note: This is less secure but necessary for some corporate/network environments
        System.setProperty("mail.smtp.ssl.checkserveridentity", "false");
        logger.info("Mail SSL configuration: Server identity check disabled to handle certificate validation issues");
    }
}

