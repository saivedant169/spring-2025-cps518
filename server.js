const express = require('express');
const crypto = require('crypto');
const axios = require('axios'); // For making HTTP requests
const nodemailer = require('nodemailer'); // For sending email notifications
const marked = require('marked'); // For converting markdown to HTML

const app = express();
const port = 3000;
const secret = 'saivedant';
const LM_STUDIO_URL = 'http://localhost:1234/v1/completions';
// Replace with LM Studio's actual endpoint

// Middleware to capture the raw body for signature verification
app.use(express.json({
  verify: (req, res, buf, encoding) => {
    req.rawBody = buf;
  }
}));

function generateHTMLReport(reviewData) {
  // Parse markdown to HTML for the review findings
  const findingsHtml = marked.parse(reviewData.findings);

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <title>Code Review Report</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 20px; }
      h1 { text-align: center; }
      .section { margin-bottom: 20px; }
      .section h2 { border-bottom: 1px solid #ccc; }
    </style>
  </head>
  <body>
    <h1>Code Review Report</h1>
    <div class="section">
      <h2>Repository Details</h2>
      <p><strong>Repository:</strong> ${reviewData.repository}</p>
      <p><strong>Commit:</strong> ${reviewData.commit}</p>
      <p><strong>Author:</strong> ${reviewData.author}</p>
      <p><strong>Message:</strong> ${reviewData.message}</p>
    </div>
    <div class="section">
      <h2>Review Findings</h2>
      ${findingsHtml}
    </div>
  </body>
  </html>
  `;
}


// Webhook endpoint for GitHub events
app.post('/webhook', async (req, res) => {
  const signature = req.headers['x-hub-signature-256'];
  if (!signature) {
    return res.status(400).send('Missing signature');
  }

  // Verify signature
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(req.rawBody);
  const expected = 'sha256=' + hmac.digest('hex');

  if (signature !== expected) {
    return res.status(403).send('Forbidden');
  }

  console.log('Webhook received:', req.body);

  // Prepare the payload for LM Studio based on the GitHub webhook data.
  // Adjust this structure as needed to match LM Studio's API requirements.
  // Prepare the payload for LM Studio based on the GitHub webhook data.
  // Extract only the necessary parts from the GitHub webhook payload
  const { repository, head_commit } = req.body;

  console.log('Prompt for LM Studio:', head_commit);
  const codeDiff = head_commit && head_commit.modified
    ? head_commit.modified.join("\n")
    : 'No modified files data available';

  // Create a concise prompt for LM Studio
  const prompt = `
You are an expert code reviewer. Please analyze the following commit for potential bugs, code quality issues, and performance optimizations.

Repository: ${repository.full_name}
Commit: ${head_commit?.id}
Author: ${head_commit?.author?.name}
Message: ${head_commit?.message}

Changed Files:
${codeDiff}
`;

  // Create the payload with only the necessary information

  const codeReviewPayload = {
    prompt: prompt,
    // Include any additional parameters required by LM Studio (e.g., max_tokens, temperature)
  };

  


  try {
    // Trigger the code review by sending the payload to LM Studio.
    const response = await axios.post(LM_STUDIO_URL, codeReviewPayload);
    const reviewFindings = response.data.choices[0].text;
    
    const reviewData = {
      repository: `${repository.full_name}`,   // Replace with actual repository info if available
      commit: `${head_commit?.id}`,           // Replace with the actual commit id
      author: `${head_commit?.author?.name}`,                           // Replace with the actual author
      message: `${head_commit?.message}` ,        // Replace with the commit message if available
      findings: reviewFindings
    };  
    const htmlReport = generateHTMLReport(reviewData);

    // Setup nodemailer transporter (ensure you use valid credentials)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'ooonlyfans696969@gmail.com',       // Replace with your email
        pass: 'gqgo micn gpis wqaa'           // Replace with your email/app password
      }
    });

    // Email options
    const mailOptions = {
      from: 'ooonlyfans696969@gmail.com',
      to: 'saivedant169@gmail.com',            // Replace with recipient's email
      subject: 'Automated Code Review Report',
      text: 'Please find attached the latest code review report.',
      html: htmlReport,
    };

    // Send email notification with the PDF report attached
    await transporter.sendMail(mailOptions);
    res.status(200).send('Code review triggered successfully');
  } catch (error) {
    console.error('Error triggering code review:', error.message);
    res.status(500).send('Error triggering code review');
  }
});

app.listen(port, () => {
  console.log(`Webhook server listening on port ${port}`);
});
