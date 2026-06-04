import axios from 'axios';
import crypto from 'crypto';

function verifyWebhook(req) {
  const hmac = req.headers['x-shopify-hmac-sha256'];
  const raw = JSON.stringify(req.body);
  const hash = crypto
    .createHmac('sha256', process.env.SHOPIFY_WEBHOOK_SECRET)
    .update(raw, 'utf8')
    .digest('base64');
  return hmac === hash;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  if (!verifyWebhook(req)) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const order = req.body;

    const name = `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`.trim();
    let phone = (order.customer?.phone || order.billing_address?.phone || '').replace(/D/g, '');
    if (!phone) return res.status(200).json({ status: 'no_phone' });
    if (!phone.startsWith('91')) phone = '91' + phone;

    const orderId = order.order_number || order.id;

    const waRes = await axios.post(
      'https://partnersv1.pinbot.ai/v3/1205280989326662/messages',
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phone,
        type: 'template',
        template: {
          name: 'delivery_confirmation_',
          language: { code: 'en' },
          components: [
            {
              type: 'header',
              parameters: [{
                type: 'image',
                image: { link: 'https://whatsappdata.s3.ap-south-1.amazonaws.com/userMedia/.../delivery_confirmation.jpeg' }
              }]
            },
            {
              type: 'body',
              parameters: [
                { type: 'text', text: name },
                { type: 'text', text: `#${orderId}` }
              ]
            }
          ]
        }
      },
      { headers: { 'Content-Type': 'application/json', 'apikey': process.env.PINBOT_API_KEY } }
    );

    res.status(200).json({ status: 'success', data: waRes.data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: err.message });
  }
}