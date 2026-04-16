import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  attachments?: any[];
}

export async function sendOrderEmails(customerInfo: any, items: any[], pdfBuffer?: Buffer) {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.GMAIL_USER || '';
  const customerEmail = customerInfo.email;

  const orderSummaryText = `
    Novo pedido recebido!
    
    Cliente: ${customerInfo.name}
    Telefone: ${customerInfo.phone}
    Email: ${customerInfo.email}
    
    Itens:
    ${items.map(item => `- ${item.name} (${item.code}): Qtd ${item.quantity}${item.customization ? `\n      📌 Personalização: ${item.customization}` : ''}`).join('\n')}
  `;

  const mailOptionsAdmin = {
    from: process.env.GMAIL_USER,
    to: adminEmail,
    subject: `Novo Pedido - ${customerInfo.name}`,
    text: orderSummaryText,
    attachments: pdfBuffer ? [
      {
        filename: `Pedido_${customerInfo.name.replace(/\s/g, '_')}.pdf`,
        content: pdfBuffer
      }
    ] : []
  };

  // Send to Admin
  await transporter.sendMail(mailOptionsAdmin);

  // Send confirmation to Customer if email provided
  if (customerEmail) {
    const mailOptionsCustomer = {
      from: process.env.GMAIL_USER,
      to: customerEmail,
      subject: `Confirmação de Pedido - Loja de Peças`,
      text: `Olá ${customerInfo.name}, recebemos seu pedido! Segue em anexo o resumo em PDF.`,
      attachments: pdfBuffer ? [
        {
          filename: `Pedido_Resumo.pdf`,
          content: pdfBuffer
        }
      ] : []
    };
    await transporter.sendMail(mailOptionsCustomer);
  }
}
