import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  try {
    const customer = req.body;

    const customerName = (customer.first_name || '') + ' ' + (customer.last_name || '');
    let customerPhone = (customer.phone || '').replace(/\D/g, '');
    if (!customerPhone.startsWith('91')) customerPhone = '91' + customerPhone;

    // Pinbot API payload
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: customerPhone,
      type: "template",
      template: {
        name: "welcome_new_customer_",
        language: { code: "en" },
        components: [
          { type: "body", parameters: [{ type: "text", text: customerName }] }
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

    // Only update Shopify metafield if WhatsApp message was sent
    if (response.data.messages && response.data.messages[0].message_status === "accepted") {
      // Update Shopify customer metafield to mark welcome message sent
      await axios.put(
        `https://${SHOPIFY_STORE}/admin/api/2026-07/customers/${customer.id}.json`,
        {
          customer: {
            id: customer.id,
            metafields: [
              {
                namespace: "custom",
                key: "welcome_sent",
                value: "true",
                type: "boolean"
              }
            ]
          }
        },
        {
          headers: { "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN }
        }
      );
    }

    res.status(200).json({ status: 'success', data: response.data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: err.message });
  }
}