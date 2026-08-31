"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  QrCode,
  CheckCircle2,
  Loader2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  Copy,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { renewMemberPlanOnlineAction } from "./actions";

export function MemberPaymentCheckout({
  memberName,
  gymName,
  currentPlanName,
  planPrice,
}: {
  memberName: string;
  gymName: string;
  currentPlanName?: string;
  planPrice?: number;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [method, setMethod] = useState<"UPI" | "CARD">("UPI");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [txnId, setTxnId] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const price = planPrice || 2499;
  const upiId = "xyro.fitness@okaxis";

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleSimulatePayment = async () => {
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const res = await renewMemberPlanOnlineAction({
        paymentMethod: method === "UPI" ? "UPI" : "CARD",
      });

      if (res.ok) {
        setTxnId(res.transactionId);
        setIsPaid(true);
      } else {
        setErrorMessage(res.error || "Payment processing failed. Please try again.");
      }
    } catch {
      setErrorMessage("Network error processing renewal. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        onClick={() => {
          setIsPaid(false);
          setIsOpen(true);
        }}
        className="btn-primary inline-flex items-center gap-2 h-9 px-4 text-xs font-bold text-white cursor-pointer"
      >
        <CreditCard className="h-3.5 w-3.5" />
        <span>Pay / Renew Online</span>
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#33281E]/40 backdrop-blur-md animate-fade-up">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-[#E5D9C5] bg-white shadow-[0_25px_70px_rgba(51,40,30,0.15)] text-left">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#E5D9C5] bg-[#FAF9F7] px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#8B5E34] text-white shadow-xs">
                  <CreditCard className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-[#33281E]">
                    XYRO Instant Checkout
                  </h3>
                  <p className="text-[10px] text-[#8C7A6B]">{gymName}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-[#8C7A6B] hover:text-[#33281E] hover:bg-[#F3EFEA] rounded-lg transition cursor-pointer p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {isPaid ? (
                <div className="text-center py-4 space-y-3.5">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800">
                    <CheckCircle2 className="h-7 w-7" />
                  </div>
                  <h4 className="font-display text-xl font-bold text-[#33281E]">
                    Payment Successful!
                  </h4>
                  <p className="text-xs text-[#8C7A6B] leading-relaxed">
                    Thank you, <strong className="text-[#33281E]">{memberName}</strong>. Your membership for{" "}
                    <strong className="text-[#8B5E34]">{currentPlanName || "Gym Plan"}</strong> has been renewed.
                  </p>

                  <div className="rounded-2xl border border-[#E5D9C5] bg-[#F9F8F6] p-3.5 text-xs space-y-1.5 text-left">
                    <div className="flex justify-between text-[#8C7A6B]">
                      <span>Amount Paid:</span>
                      <strong className="text-[#33281E] font-mono">₹{price.toLocaleString()}</strong>
                    </div>
                    <div className="flex justify-between text-[#8C7A6B]">
                      <span>Transaction Reference:</span>
                      <span className="text-[#8B5E34] font-mono font-semibold">
                        {txnId || "TXN-VERIFIED"}
                      </span>
                    </div>
                    <div className="flex justify-between text-[#8C7A6B]">
                      <span>Status:</span>
                      <Badge variant="success" className="text-[10px]">
                        PAID &amp; VERIFIED
                      </Badge>
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      router.refresh();
                    }}
                    className="btn-primary mt-2 h-10 w-full text-xs font-bold text-white"
                  >
                    Return to Member Dashboard
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Order Summary */}
                  <div className="rounded-2xl border border-[#E5D9C5] bg-[#F9F8F6] p-4 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-[#8B5E34]">
                        Renewal Package
                      </span>
                      <h4 className="font-display text-base font-bold text-[#33281E] mt-0.5">
                        {currentPlanName || "Standard Membership"}
                      </h4>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-[#8C7A6B]">Total Due</span>
                      <p className="font-display text-xl font-bold text-[#33281E]">
                        ₹{price.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Payment Method Switcher */}
                  <div className="grid grid-cols-2 gap-2 p-1 bg-[#F9F8F6] rounded-2xl border border-[#E5D9C5]">
                    <button
                      type="button"
                      onClick={() => setMethod("UPI")}
                      className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                        method === "UPI"
                          ? "bg-[#8B5E34] text-white shadow-xs"
                          : "text-[#8C7A6B] hover:text-[#33281E]"
                      }`}
                    >
                      <Smartphone className="h-3.5 w-3.5" />
                      <span>Instant UPI / QR</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMethod("CARD")}
                      className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                        method === "CARD"
                          ? "bg-[#8B5E34] text-white shadow-xs"
                          : "text-[#8C7A6B] hover:text-[#33281E]"
                      }`}
                    >
                      <CreditCard className="h-3.5 w-3.5" />
                      <span>Debit / Card</span>
                    </button>
                  </div>

                  {/* UPI QR Mode */}
                  {method === "UPI" ? (
                    <div className="space-y-3 text-center">
                      <div className="mx-auto w-44 rounded-2xl border border-[#E5D9C5] bg-white p-3 shadow-md">
                        {/* Dynamic Stylized QR Placeholder */}
                        <div className="flex flex-col items-center justify-center h-38 bg-[#F9F8F6] rounded-xl border border-[#E5D9C5]">
                          <QrCode className="h-28 w-28 text-[#33281E]" />
                          <span className="text-[9px] font-mono text-[#8C7A6B] font-semibold">
                            Scan with GPay / PhonePe
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between rounded-xl border border-[#E5D9C5] bg-[#F9F8F6] px-3 py-2 text-xs">
                        <span className="font-mono text-[#33281E] text-[11px] font-medium">{upiId}</span>
                        <button
                          type="button"
                          onClick={handleCopyUpi}
                          className="flex items-center gap-1 text-[#8B5E34] hover:text-[#754E29] text-[11px] font-bold cursor-pointer"
                        >
                          {copiedUpi ? (
                            <>
                              <Check className="h-3 w-3" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span>Copy UPI</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Card Mode */
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] uppercase font-mono font-bold text-[#8C7A6B] tracking-wider">
                          Card Number
                        </label>
                        <input
                          type="text"
                          placeholder="4111 2222 3333 4444"
                          defaultValue="•••• •••• •••• 8492"
                          className="mt-1 h-9 w-full rounded-xl border border-[#E5D9C5] bg-white px-3 text-xs text-[#33281E] outline-none focus:border-[#8B5E34]"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] uppercase font-mono font-bold text-[#8C7A6B] tracking-wider">
                            Expiry
                          </label>
                          <input
                            type="text"
                            placeholder="MM/YY"
                            defaultValue="12/28"
                            className="mt-1 h-9 w-full rounded-xl border border-[#E5D9C5] bg-white px-3 text-xs text-[#33281E] outline-none focus:border-[#8B5E34]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase font-mono font-bold text-[#8C7A6B] tracking-wider">
                            CVV
                          </label>
                          <input
                            type="password"
                            placeholder="•••"
                            defaultValue="123"
                            className="mt-1 h-9 w-full rounded-xl border border-[#E5D9C5] bg-white px-3 text-xs text-[#33281E] outline-none focus:border-[#8B5E34]"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {errorMessage && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 font-medium">
                      {errorMessage}
                    </div>
                  )}

                  {/* Submit Action */}
                  <Button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleSimulatePayment}
                    className="btn-primary mt-2 h-11 w-full text-xs font-bold text-white cursor-pointer"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying Transaction with Bank...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-1.5 h-4 w-4" />
                        Complete Payment of ₹{price.toLocaleString()}
                      </>
                    )}
                  </Button>

                  <div className="flex items-center justify-center gap-1.5 text-[10px] text-[#8C7A6B] pt-1">
                    <ShieldCheck className="h-3 w-3 text-emerald-700" />
                    <span>256-Bit Encrypted Secure Checkout</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
