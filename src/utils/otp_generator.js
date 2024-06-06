import nodemailer from "nodemailer";

const generateOTP = () => {
  let otp = "";
  let array = [];
  for (let i = 0; i < 4; i++) {
    const num = Math.floor(Math.random() * 10);
    otp += num;
  }
  otp = Number(otp);
  return otp;
};

const transporter = nodemailer.createTransport({
  service: "gmail",
  host : "smtp.gmail.com",
  port : 587,
  secure : false,
  auth: {
    user: process.env.NODEMAILER_EMAIL,
    pass: process.env.NODEMAILER_PASSWORD,
  },
});

transporter.on("sent", (info) => {
  console.log("Email sent:", info.response);
  if (info.rejected.length > 0) {
    console.log("Some recipients were rejected:", info.rejected);
    return false;
  }
});

const sendOTPThroughEmail = async (userEmail, OTP) => {
  console.log(userEmail);
  let mailOptions = {
    from: "manas.agarwal1604@gmail.com",
    to: userEmail,
    subject: "OTP verification",
    text: `Your OTP for email verification : ${OTP}`,
  };

  try {
    let info = await transporter.sendMail(mailOptions);
    return true; // Email sent successfully
  } catch (error) {
    console.error("Error occurred:", error);
    console.log("Error message:", error.message);
    return false;
  }
};
export { generateOTP, sendOTPThroughEmail };
