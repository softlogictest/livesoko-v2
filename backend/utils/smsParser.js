const parseSms = (message) => {
  try {
    const txCodeMatch = message.match(/[A-Z0-9]{10}/);
    const txCode = txCodeMatch ? txCodeMatch[0] : null;

    const amountMatch = message.match(/Ksh\s*([\d,]+\.?\d*)/);
    const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : null;

    const senderMatch = message.match(/received from ([A-Z \-]+?)(?:\s+\d{10}|\s+on\s+|$)/i);
    const senderFallbackMatch = message.match(/received from ([A-Za-z ]+?)\s*\d/);
    let senderName = null;
    if (senderMatch) {
      senderName = senderMatch[1].trim();
    } else if (senderFallbackMatch) {
      senderName = senderFallbackMatch[1].trim();
    }

    const dateMatch = message.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    let date = null;
    if (dateMatch) {
      date = {
        day: parseInt(dateMatch[1]),
        month: parseInt(dateMatch[2]),
        year: parseInt(dateMatch[3])
      };
    }

    if (!txCode || amount === null) {
      return { success: false, error: 'PARSE_ERROR' };
    }

    return {
      success: true,
      data: {
        txCode,
        amount,
        senderName,
        date
      }
    };
  } catch (error) {
    return { success: false, error: 'PARSE_ERROR' };
  }
};

module.exports = { parseSms };
