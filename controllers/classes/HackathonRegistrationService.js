import QRCode from "qrcode";
import puppeteer from "puppeteer";
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
// import team from "../../models/team.js";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class HackathonRegistrationService {
  constructor(team, hackathon) {
    this.team = team;
    this.hackathon = hackathon;
  }

  async generateQRCode() {
    try {
      const qrCodeData = await QRCode.toDataURL(this.team._id.toString());
      await team.findByIdAndUpdate(this.team._id, { team_qr_code: qrCodeData });
      this.team.team_qr_code = qrCodeData;
    } catch (error) {
      throw new Error("Failed to generate QR code: " + error.message);
    }
  }

  async generatePDF() {
    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      const page = await browser.newPage();

      let transactionIdContent = "-NA-";
      if (this.team.paymentData?.data?.transactionId) {
        transactionIdContent = ` ${this.team.paymentData.data.transactionId}`;
      }
      let priceContent =
        this.team.paymentData.data.amount && this.team.paymentData.data.amount !== "0"
          ? ` ${this.team.paymentData.data.amount}`
          : "FREE";


      const content = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link rel="stylesheet" href="./index.css">
          <title>Hackathon Registration PDF</title>
          <style>
              .container{
                  background-color:rgb(32, 31, 31);
                  width:50%;
                  height: auto;
                  padding:2rem;
                  color: white;
              }
              
              .header1{
                  display: flex;
                  flex-direction: row;
              }
              
              .team-name{
                  flex: 50%;
              }
              
              .qr-code{
                  flex: 0%;
              }
              
              h3{
                  font-weight: 300;
              }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header1">
                  <div class="team-name">
                      <h1>Team Name: ${this.team.team_name}</h1>
                      <h3>Merchant ID: ${this.team.merchand_transaction_id}</h3>
                  </div>
                  <div class="qr-code">
                      <img src="${this.team.team_qr_code}" alt="qr code">
                  </div>            
              </div>
              <div class="event-details">
                  <h2>Event Details: </h2>
                  <h3>Name: ${this.hackathon.hackathon_name}</h3>
                  <h3>Venue: ${this.hackathon.hackathon_venue}</h3>
                  <h3>Timings: ${this.hackathon.hackathon_duration}</h3>
              </div>
              <br>
              <div class="team-leader">
                  <h2>Team Leader Name : ${this.team_members[0].name}</h2>
                  <h3>Team Leader Email : ${this.team_members[0].email}</h3>
                  <h3>Team Leader Phone Number : ${this.team_members[0].phone_number}</h3>
              </div>
              <br>
              <div class="team-details">
                  <h2>Team Members:</h2>
                  ${this.team.team_members.map((member, index) => `<h3>Member ${index + 1}: ${member.name} (${member.email})</h3>`).join('')}
              </div>
              <br>
              <div class="footer">
                  <p>&copy; <script>document.write(new Date().getFullYear())</script> EventAura</p>
              </div>
          </div>
      </body>
      </html>
      
      `;
      const pdfDirectory = path.join(__dirname, "../../public/pdf");
      if (!fs.existsSync(pdfDirectory))
        fs.mkdirSync(pdfDirectory, { recursive: true });

      const pdfPath = path.join(pdfDirectory, `${this.team._id}.pdf`);
      await page.setContent(content);
      await page.pdf({ path: pdfPath, format: "A4" });
      await browser.close();
      this.pdfPath = pdfPath;
    } catch (error) {
      throw new Error("Failed to generate PDF: " + error.message);
    }
  }

  async sendEmail() {
    try {
      if (!fs.existsSync(this.pdfPath))
        throw new Error("PDF file not found for sending email.");
      const transporter = nodemailer.createTransport({
        service: "gmail",
        secure: false, // true for 465, false for other ports
        auth: {
          team: process.env.EMAIL,
          pass: process.env.PASSWORD,
        },
      });

      const mailOptions = {
        from: process.env.EMAIL,
        to: this.team.team_members[0].email,
        subject: "Hackathon Registration Confirmation",
        html: `
        <!DOCTYPE html>
        <html lang="en">
          <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Event Registration Confirmation</title>
        <style>
          @import url("https://fonts.googleapis.com/css2?family=Poppins:wght@400;700&display=swap");

          body {
            font-family: "Poppins", sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
            color: #333;
          }

          .container {
            max-width: 600px;
            margin: 20px auto;
            padding: 20px;
            background-color: #fff;
            border-radius: 10px;
            box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
          }

          .header {
            text-align: center;
            margin-bottom: 20px;
            padding: 20px;
            border-radius: 10px 10px 0 0;
            background-color: #f0f0f0;
          }

          .header h1 {
            color: #4c51bf; /* Tailwind indigo-600 */
            font-size: 2em;
            margin: 0;
            padding: 0;
          }

          .content {
            padding: 20px;
          }

          .footer {
            padding: 20px;
            text-align: center;
            background-color: #f0f0f0;
            border-bottom-left-radius: 10px;
            border-bottom-right-radius: 10px;
            color: #777;
          }

          p {
            margin: 10px 0;
            line-height: 1.6;
          }

          h2 {
            color: #333;
            margin-bottom: 10px;
          }

          a {
            color: #007bff;
        text-decoration: none;
      }

      a:hover {
        text-decoration: underline;
      }

      .cta-button {
        display: inline-block;
        padding: 10px 20px;
        margin: 20px 0;
        background-color: rgb(0, 123, 255);
        color: #fff;
        text-decoration: none;
        border-radius: 5px;
      }

      .cta-button:hover {
        background-color: #005bb5;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>EventAura</h1>
      </div>
      <div class="content">
        <p>Dear ${this.team.team_members[0].name},</p>
        <p>
          Thank you for registering for the event
          <strong>${this.team.hackathon_name}</strong> hosted by
          <strong>${this.hackathon.hackathon_host}</strong> at
          <strong>${this.hackathon.hackathon_venue}</strong>. We're delighted to have you
          join us and hope you have a wonderful experience!
        </p>
        <p>${this.hackathon.hackathon_mail_description}</p>
        <h2>Hackathon Venue</h2>
        <p>
          The event will be held at <strong>${this.hackathon.hackathon_venue}</strong>.
          For more information about the venue, including directions and
          facilities follow the link:
          <a href="${this.hackathon.hackathon_venue.name}">${this.hackathon.hackathon_venue.url}</a>.
        </p>
        <h2>Contact Details</h2>
        // <p><strong>Email:</strong> ${this.event.eventManagerMail}</p>
        // <p><strong>Phone:</strong> ${this.event.eventManagerPhone}</p>
        <p>
          Please find your registration details and QR code in the attached PDF.
        </p>
      </div>
      <div class="footer">
        <p>
          <p>&copy; <script>document.write(new Date().getFullYear())</script> EventAura</p>
        </p>
      </div>
    </div>
  </body>
</html>       
        `,
        attachments: [{ filename: `${this.team._id}.pdf`, path: this.pdfPath }],
      };

      await transporter.sendMail(mailOptions);

      if (fs.existsSync(this.pdfPath)) {
        fs.unlinkSync(this.pdfPath);
      }
    } catch (error) {
      throw new Error("Failed to send email: " + error.message);
    }
  }
}

export default HackathonRegistrationService;
