const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  async initializeTransporter() {
    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'mail-hybrid.kmutt.ac.th',
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        tls: {
          // Do not fail on invalid certs
          rejectUnauthorized: false
        }
      });

      // Verify connection configuration
      await this.transporter.verify();
      console.log('Email service initialized successfully');
    } catch (error) {
      console.error('Email service initialization failed:', error.message);
      throw error;
    }
  }

  /**
   * Load email template
   * @param {string} templateName - Name of the template file (without extension)
   * @param {object} variables - Variables to replace in template
   * @returns {Promise<string>} - Rendered template
   */
  async loadTemplate(templateName, variables = {}) {
    try {
      const templatePath = path.join(__dirname, '..', 'templates', 'emails', `${templateName}.html`);
      let template = fs.readFileSync(templatePath, 'utf8');

      // Handle conditional blocks {{#if variable}} content {{/if}}
      template = template.replace(/\{\{\#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, varName, content) => {
        const value = variables[varName];
        // Show content if variable exists and is truthy (not null, undefined, empty string, or false)
        return (value && value.toString().trim() !== '') ? content : '';
      });

      // Replace variables in template
      for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`\{\{${key}\}\}`, 'g');
        template = template.replace(regex, value || '');
      }

      return template;
    } catch (error) {
      console.error(`Failed to load template ${templateName}:`, error.message);
      throw new Error(`Template ${templateName} not found`);
    }
  }

  /**
   * Send email to individual recipient
   * @param {object} emailOptions - Email configuration
   * @returns {Promise<object>} - Send result
   */
  async sendEmail(emailOptions) {
    const {
      to,
      subject,
      template,
      variables = {},
      attachments = [],
      from = process.env.EMAIL_FROM || 'noreply@kmutt.ac.th'
    } = emailOptions;

    try {
      const htmlContent = await this.loadTemplate(template, variables);

      const mailOptions = {
        from: from,
        to: to,
        subject: subject,
        html: htmlContent,
        attachments: attachments
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`Email sent successfully to ${to}:`, result.messageId);
      
      return {
        success: true,
        messageId: result.messageId,
        recipient: to
      };
    } catch (error) {
      console.error(`Failed to send email to ${to}:`, error.message);
      return {
        success: false,
        error: error.message,
        recipient: to
      };
    }
  }

  /**
   * Send email to multiple recipients individually
   * @param {object} emailOptions - Email configuration
   * @returns {Promise<object>} - Bulk send result
   */
  async sendBulkEmail(emailOptions) {
    const {
      recipients,
      subject,
      template,
      variables = {},
      attachments = [],
      from = process.env.EMAIL_FROM || 'noreply@kmutt.ac.th'
    } = emailOptions;

    const results = {
      successful: [],
      failed: [],
      total: recipients.length
    };

    console.log(`Starting bulk email send to ${recipients.length} recipients`);

    // Send emails one by one for better delivery control and personalization
    for (const recipient of recipients) {
      try {
        // Allow for personalized variables per recipient
        const personalizedVariables = {
          ...variables,
          ...(recipient.variables || {}),
          recipientEmail: recipient.email,
          recipientName: recipient.name || recipient.email
        };

        const result = await this.sendEmail({
          to: recipient.email,
          subject: subject,
          template: template,
          variables: personalizedVariables,
          attachments: attachments,
          from: from
        });

        if (result.success) {
          results.successful.push({
            email: recipient.email,
            messageId: result.messageId
          });
        } else {
          results.failed.push({
            email: recipient.email,
            error: result.error
          });
        }

        // Add small delay between emails to prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        results.failed.push({
          email: recipient.email,
          error: error.message
        });
      }
    }

    console.log(`Bulk email send completed. Success: ${results.successful.length}, Failed: ${results.failed.length}`);
    return results;
  }

  /**
   * Send email with BCC (single email to multiple recipients via BCC)
   * @param {object} emailOptions - Email configuration
   * @returns {Promise<object>} - Send result
   */
  async sendEmailWithBCC(emailOptions) {
    const {
      recipients,
      to, // Support both recipients and to
      subject,
      template,
      variables = {},
      attachments = [],
      from = process.env.EMAIL_FROM || 'noreply@kmutt.ac.th'
    } = emailOptions;

    try {
      const htmlContent = await this.loadTemplate(template, variables);

      // Handle both recipients array and to array
      let recipientList = recipients || to;
      
      // Validate that we have recipients
      if (!recipientList || !Array.isArray(recipientList) || recipientList.length === 0) {
        throw new Error('Recipients array is required for BCC email');
      }

      // Extract email addresses from recipients array
      const emailAddresses = recipientList.map(recipient => 
        typeof recipient === 'string' ? recipient : recipient.email
      ).filter(email => email); // Remove undefined/null emails

      if (emailAddresses.length === 0) {
        throw new Error('No valid email addresses found in recipients');
      }

      const mailOptions = {
        from: from,
        to: from, // Microsoft Exchange might require a valid 'to' field
        bcc: emailAddresses.join(', '), // All recipients in BCC
        subject: subject,
        html: htmlContent,
        attachments: attachments
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`Email with BCC sent successfully to ${emailAddresses.length} recipients:`, result.messageId);
      
      return {
        success: true,
        messageId: result.messageId,
        recipients: emailAddresses,
        totalCount: emailAddresses.length
      };
    } catch (error) {
      console.error('Failed to send email with BCC:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get email templates list
   * @returns {Array<string>} - Available templates
   */
  getAvailableTemplates() {
    try {
      const templatesDir = path.join(__dirname, '..', 'templates', 'emails');
      const files = fs.readdirSync(templatesDir);
      return files
        .filter(file => file.endsWith('.html'))
        .map(file => file.replace('.html', ''));
    } catch (error) {
      console.error('Failed to get available templates:', error.message);
      return [];
    }
  }

  /**
   * Test email configuration
   * @returns {Promise<boolean>} - Configuration test result
   */
  async testConnection() {
    try {
      if (!this.transporter) {
        await this.initializeTransporter();
      }
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Email connection test failed:', error.message);
      return false;
    }
  }
}

module.exports = new EmailService();