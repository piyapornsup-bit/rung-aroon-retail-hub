/** Pure POS rules — keep free of React so they are easy to test. */

export interface PointRules {
  earnStepBaht?: number;
  earnPointsPerStep?: number;
  pointsPerBaht?: number;
  minPointsToRedeem?: number;
  spendBahtPerPoint?: number;
}

/** ซื้อครบ 50 บาท ได้ 5 แต้ม */
export const EARN_STEP_BAHT = 50;
export const EARN_POINTS_PER_STEP = 5;
/** 10 แต้ม = 1 บาท */
export const POINTS_PER_BAHT = 10;
/** Points are redeemed in blocks of this size. */
export const REDEEM_STEP_POINTS = 10;

export interface BillLine {
  productId: string;
  price: number;
  qty: number;
}

/**
 * คำนวณแต้มสะสมจากยอดซื้อสุทธิ:
 * pointsEarnedFor(net) = floor(net / earnStepBaht) * earnPointsPerStep
 */
export const pointsEarnedFor = (netBaht: number, rules?: PointRules) => {
  const stepBaht = rules?.earnStepBaht ?? rules?.spendBahtPerPoint ?? EARN_STEP_BAHT;
  const pointsPerStep =
    rules?.earnPointsPerStep ??
    (rules?.earnStepBaht !== undefined
      ? EARN_POINTS_PER_STEP
      : rules?.spendBahtPerPoint !== undefined
        ? 1
        : EARN_POINTS_PER_STEP);

  if (stepBaht <= 0 || pointsPerStep <= 0) return 0;
  return Math.floor(Math.max(0, netBaht) / stepBaht) * pointsPerStep;
};

export const pointsToBaht = (
  points: number,
  pointsPerBahtOrRules?: number | PointRules,
) => {
  const ppb =
    typeof pointsPerBahtOrRules === "number"
      ? pointsPerBahtOrRules
      : (pointsPerBahtOrRules?.pointsPerBaht ?? POINTS_PER_BAHT);
  return ppb > 0 ? Math.floor(points / ppb) : 0;
};

/** Max points that can be redeemed: bounded by balance, minimum threshold, and by the bill subtotal. */
export const maxRedeemablePoints = (
  memberPoints: number,
  subtotal: number,
  rules?: PointRules,
) => {
  const minPoints = rules?.minPointsToRedeem ?? 0;
  if (memberPoints < minPoints) return 0;

  const pointsPerBaht = rules?.pointsPerBaht ?? POINTS_PER_BAHT;
  if (pointsPerBaht <= 0) return 0;

  const byBalance = Math.floor(memberPoints / pointsPerBaht) * pointsPerBaht;
  const bySubtotal = Math.floor(subtotal) * pointsPerBaht;
  return Math.max(0, Math.min(byBalance, bySubtotal));
};

export const calcBill = (
  lines: BillLine[],
  redeemPoints = 0,
  rules?: PointRules,
) => {
  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const discount = Math.min(pointsToBaht(redeemPoints, rules), subtotal);
  const net = subtotal - discount;
  return { subtotal, discount, net, pointsEarned: pointsEarnedFor(net, rules) };
};

export const calcChange = (cash: number, net: number) => cash - net;

/** VAT 7% included in a price (for full tax invoices). */
export const vatIncluded = (amount: number) => Math.round(((amount * 7) / 107) * 100) / 100;

/** Validate a 13-digit Thai tax ID. */
export const isValidTaxId = (id: string) => /^\d{13}$/.test(id.replace(/[\s-]/g, ""));
