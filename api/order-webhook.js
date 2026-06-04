// /api/order-webhook.js
import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const order = req.body;

    // Extract customer info
    const customerName = order.customer.first_name + ' ' + order.customer.last_name;
    const customerPhone = order.customer.phone; // Ensure phone includes country code
    const orderId = order.id;

    // Pinbot API payload
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: customerPhone,
      type: "template",
      template: {
        name: "delivery_confirmation_",
        language: { code: "en" },
        components: [
          {
            type: "header",
            parameters: [
              {
                type: "image",
                image: {
                  link: "https://whatsappdata.s3.ap-south-1.amazonaws.com/userMedia/.../delivery_confirmation.jpeg"
                }
              }
            ]
          },
          {
            type: "body",
            parameters: [
              { type: "text", text: customerName },
              { type: "text", text: `Order #${orderId} confirmed!` }
            ]
          }
        ]
      }
    };

    // Call Pinbot API
    const response = await axios.post(
      'https://partnersv1.pinbot.ai/v3/1205280989326662/messages',
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'apikey': '031e0cb6-58d8-11f1-894a-02c8a5e042bd'
        }
      }
    );

    res.status(200).json({ status: 'success', data: response.data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: err.message });
  }
}