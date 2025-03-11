import axios from "axios";
import crypto from "crypto";
import HackathonTeamModel from "../models/HackathonTeamModel.js";
import HackathonModel from "../models/HackathonModel.js";
import dotenv from "dotenv";
import HackathonRegistrationService from "./classes/HackathonRegistrationService.js";
dotenv.config();

const HackathonRegistration = async (req, res) => {
  try {
    const { team_name, team_members, hackathon_name, team_extra } = req.body;
    const { id } = req.params;

    const hackathon = await HackathonModel.findById(id);
    if (!hackathon) {
      return res.status(404).json({ message: false, error: "Event not found" });
    }

    const merchantTransactionId = `MT${Math.floor(Math.random() * 1000000)}`;
    const key = process.env.KEY;
    const keyIndex = process.env.KEY_INDEX || 1;
    const merchantId = process.env.MERCHAND_ID;
    const amount = event.eventPrice;

    const hackathon_team = await HackathonTeamModel.create({
      team_name,
      team_members,
      hackathon_name,
      team_extra,
      merchand_transaction_id: merchantTransactionId,
    });

    const data = {
      merchantId,
      merchantTransactionId,
      merchantUserId: merchantId,
      amount: parseInt(amount) * 100,
      redirectUrl: `https://api.eventaura.tech/api/phone-pay/status/${merchantId}/${merchantTransactionId}/${hackathon._id}`,
      redirectMode: "POST",
      mobileNumber: phoneNumber,
      paymentInstrument: {
        type: "PAY_PAGE",
      },
    };
    const payload = JSON.stringify(data);
    const payloadMain = Buffer.from(payload).toString("base64");
    const string = payloadMain + "/pg/v1/pay" + key;
    const sha256 = crypto.createHash("sha256").update(string).digest("hex");
    const checksum = sha256 + "###" + keyIndex;
    const URL = "https://api.phonepe.com/apis/hermes/pg/v1/pay";

    const options = {
      method: "post",
      url: URL,
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
        "X-VERIFY": checksum,
      },
      data: {
        request: payloadMain,
      },
    };

    const response = await axios.request(options);
    if (response.data.success) {
      const redirectUrl =
        response.data.data?.instrumentResponse?.redirectInfo?.url;
      if (redirectUrl) {
        res.send(redirectUrl);
      } else {
        res.status(400).json({ message: "Redirect URL not found in response" });
      }
    } else {
      res.status(400).json({ message: "Payment initiation failed" });
    }
  } catch (error) {
    console.error("Error in HackathonRegistratoin:", error);
    res.status(500).json({ message: false, error });
  }
};

const PaidHackathonStatus = async (req, res) => {
  const { merchantTransactionId, hackathonId } = req.params;

  const key = process.env.KEY; // Production key
  const keyIndex = process.env.KEY_INDEX || 1; // Production key index
  const merchantId = process.env.MERCHAND_ID; // Production Merchant ID
  console.log(merchantTransactionId, hackathonId, key, keyIndex, merchantId);
  try {
    // Construct the string to hash
    const stringToHash =
      `/pg/v1/status/${merchantId}/${merchantTransactionId}` + key;

    // Generate the SHA-256 hash
    const sha256 = crypto
      .createHash("sha256")
      .update(stringToHash)
      .digest("hex");

    // Create the checksum
    const checksum = sha256 + "###" + keyIndex;

    // Define the URL for the status check
    const URL = `https://api.phonepe.com/apis/hermes/pg/v1/status/${merchantId}/${merchantTransactionId}`;

    // Configure the request options
    const options = {
      method: "get",
      url: URL,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-VERIFY": checksum,
        "X-MERCHANT-ID": merchantId,
      },
    };

    // Make the request
    const response = await axios.request(options);

    // Handle the response
    const hackathon_team = await HackathonTeamModel.findOne({
      merchand_transaction_id: merchantTransactionId,
    });
    const hackathon = await HackathonModel.findById(hackathonId);
    if (!hackathon_team) {
      return res.status(404).json({ message: false, error: "Team not found" });
    }

    hackathon_team.paymentData = response.data;
    await hackathon_team.save();
    res.redirect(`https://eventaura.tech/event/${user._id}/success`);

    // Additional processing (optional)
    if (response.data.data.responseCode === "SUCCESS") {
      (async () => {
        try {
          const hackathonRegistrationService = new HackathonRegistrationService(
            hackathon_team,
            hackathon
          );
          await hackathonRegistrationService.generateQRCode();
          await hackathonRegistrationService.generatePDF();
          await hackathonRegistrationService.sendEmail();
        } catch (error) {
          if (!res.headersSent) {
            return res
              .status(500)
              .json({ message: false, error: error.message });
          }
        }
      })();
    }
  } catch (error) {
    if (error.response) {
      res.status(error.response.status).json({
        message: error.message,
        data: error.response.data,
      });
    } else {
      res.status(500).json({ message: false, error: error.message });
    }
  }
};

export { HackathonRegistration, PaidHackathonStatus };
