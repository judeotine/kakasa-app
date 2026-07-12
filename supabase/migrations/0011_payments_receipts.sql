ALTER TABLE loan_payments
  ADD COLUMN payment_method text CHECK (payment_method IN ('mobile_money', 'visa_card')) DEFAULT 'mobile_money',
  ADD COLUMN phone_number text,
  ADD COLUMN card_last_four text,
  ADD COLUMN transaction_ref text UNIQUE,
  ADD COLUMN receipt_number text UNIQUE,
  ADD COLUMN provider_name text,
  ADD COLUMN status text CHECK (status IN ('completed', 'pending', 'failed')) DEFAULT 'completed',
  ADD COLUMN remaining_balance numeric;

CREATE SEQUENCE receipt_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS text AS $$
BEGIN
  RETURN 'KKS-RCP-' || lpad(nextval('receipt_number_seq')::text, 6, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_receipt_number_fn()
RETURNS trigger AS $$
BEGIN
  IF NEW.receipt_number IS NULL THEN
    NEW.receipt_number := generate_receipt_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_receipt_number
  BEFORE INSERT ON loan_payments
  FOR EACH ROW
  EXECUTE FUNCTION set_receipt_number_fn();

CREATE OR REPLACE FUNCTION update_loan_on_payment_fn()
RETURNS trigger AS $$
BEGIN
  UPDATE loans
  SET amount_paid = amount_paid + NEW.amount,
      status = CASE
        WHEN amount_paid + NEW.amount >= total_repayable THEN 'paid'
        ELSE status
      END
  WHERE id = NEW.loan_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_loan_on_payment
  AFTER INSERT ON loan_payments
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION update_loan_on_payment_fn();
