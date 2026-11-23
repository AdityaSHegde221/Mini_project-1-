const cents = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) : null;
};

export const compareRetailOrder = (order, receipt, invoice) => {
  const discrepancies = [];

  if (!receipt) {
    discrepancies.push('Customer receipt confirmation is missing.');
  }
  if (!invoice) {
    discrepancies.push('Shopkeeper invoice is missing.');
  }
  if (!receipt || !invoice) {
    return { matched: false, discrepancies };
  }

  if (Number(order.quantity) !== Number(receipt.received_quantity)) {
    discrepancies.push(`Order quantity ${order.quantity} does not match received quantity ${receipt.received_quantity}.`);
  }
  if (Number(order.quantity) !== Number(invoice.quantity)) {
    discrepancies.push(`Order quantity ${order.quantity} does not match invoice quantity ${invoice.quantity}.`);
  }
  if (cents(order.unit_price) !== cents(invoice.unit_price)) {
    discrepancies.push(`Order unit price ${order.unit_price} does not match invoice unit price ${invoice.unit_price}.`);
  }
  if (cents(order.total_amount) !== cents(invoice.total_amount)) {
    discrepancies.push(`Order total ${order.total_amount} does not match invoice total ${invoice.total_amount}.`);
  }
  if (cents(invoice.total_amount) !== cents(Number(invoice.quantity) * Number(invoice.unit_price))) {
    discrepancies.push('Invoice total does not equal invoice quantity multiplied by unit price.');
  }

  return { matched: discrepancies.length === 0, discrepancies };
};
