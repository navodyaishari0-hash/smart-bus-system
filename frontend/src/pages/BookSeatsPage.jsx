import { useState, useEffect, Fragment, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import useAuthStore from "../store/authStore";
import { QRCodeCanvas } from "qrcode.react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Bus, MapPin, Calendar, Clock, Ticket, CreditCard, X, Download, ArrowRight, Award, Percent, Timer, Phone, User, Heart } from "lucide-react";
import { io } from "socket.io-client";
import { SOCKET_URL } from "../config";

function ShareButtons({ url, title }) {
  const shareUrl = url || window.location.href;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(title + " " + shareUrl)}`;
  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => alert("Link copied!")).catch(() => prompt("Copy this link:", shareUrl));
  };
  return (
    <div className="flex gap-1.5">
      <button onClick={copyLink} title="Copy link" className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border border-slate-700/50 bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 transition-colors cursor-pointer">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg> Copy
      </button>
      <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" title="Share on WhatsApp" className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors no-underline">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg> WhatsApp
      </a>
    </div>
  );
}

function BookingSuccessModal({ schedule, selectedSeats, formData, totalFare, startStop, endStop, onViewBookings, bookingResult, onClose }) {
  const [visible, setVisible] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const ticketRef = useRef(null);
  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  const bookingId = bookingResult?._id || bookingResult?.id || "";
  const baseUrl = window.location.origin;

  const downloadPDF = async () => {
    if (!ticketRef.current) return;
    setGeneratingPDF(true);
    try {
      await document.fonts.ready;
      const images = ticketRef.current.querySelectorAll("img");
      await Promise.all(Array.from(images).map(img =>
        img.complete ? Promise.resolve() : new Promise(r => { img.onload = r; img.onerror = r; })
      ));
      const canvas = await html2canvas(ticketRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#0f172a",
        logging: false,
        windowWidth: ticketRef.current.scrollWidth,
        windowHeight: ticketRef.current.scrollHeight,
        onclone: (doc) => {
          const el = doc.body.querySelector("[data-ticket-root]");
          if (el) el.style.transform = "none";
        },
      });
      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 5;
      const usableWidth = pageWidth - margin * 2;
      const usableHeight = pageHeight - margin * 2;
      const cW = canvas.width;
      const cH = canvas.height;
      let scaleRatio = usableWidth / cW;
      let w = cW * scaleRatio;
      let h = cH * scaleRatio;
      if (h > usableHeight) {
        scaleRatio = usableHeight / cH;
        w = cW * scaleRatio;
        h = cH * scaleRatio;
      }
      const x = (pageWidth - w) / 2;
      const y = (pageHeight - h) / 2;
      pdf.addImage(imgData, "JPEG", x, y, w, h);
      pdf.save(`SmartBus_Ticket_${bookingId || "booking"}.pdf`);
    } catch (e) {
      alert("Failed to generate PDF: " + e.message);
    } finally {
      setGeneratingPDF(false);
    }
  };

  const peakHour = schedule?.isPeakHour;
  const now = new Date().toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });

  // confetti particles
  const confettiColors = ["#10b981", "#34d399", "#f59e0b", "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4"];
  const confettiParticles = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    x: (Math.random() - 0.5) * 600,
    y: (Math.random() - 0.5) * 400,
    r: Math.random() * 6 + 3,
    color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
    rotate: Math.random() * 720,
  }));

  // ESC key handler
  useEffect(() => {
    if (!visible) return;
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [visible, onClose]);

  // auto-close after 10s
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(onClose, 10000);
    return () => clearTimeout(timer);
  }, [visible, onClose]);

  const InfoRow = ({ icon, label, value, highlight }) => (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 text-slate-500 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] text-slate-500 tracking-wider uppercase leading-tight">{label}</p>
        <p className={`text-sm font-bold truncate ${highlight ? "text-emerald-400" : "text-slate-100"}`}>
          {value}
        </p>
      </div>
    </div>
  );

  return (
    <>
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-5"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label="Booking confirmation"
          >
            {/* backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

            {/* confetti burst */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {confettiParticles.map((p) => (
                <motion.div
                  key={p.id}
                  initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0 }}
                  animate={{
                    x: p.x,
                    y: p.y + 300,
                    opacity: [1, 1, 0],
                    rotate: p.rotate,
                    scale: [0, 1.2, 1],
                  }}
                  transition={{ duration: 2.5, delay: Math.random() * 0.6, ease: "easeOut" }}
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "40%",
                    width: p.r,
                    height: p.r * 1.4,
                    borderRadius: "2px",
                    background: p.color,
                  }}
                />
              ))}
            </div>

            {/* floating particles */}
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.div
                key={`float-${i}`}
                className="absolute rounded-full pointer-events-none"
                style={{
                  width: i * 4 + 6,
                  height: i * 4 + 6,
                  background: ["#10b981", "#34d399", "#f59e0b", "#3b82f6", "#8b5cf6"][i],
                  left: `${15 + i * 18}%`,
                  top: `${20 + (i % 3) * 25}%`,
                  opacity: 0.15,
                }}
                animate={{
                  y: [-20, 20, -20],
                  opacity: [0.1, 0.25, 0.1],
                }}
                transition={{ duration: 4 + i, repeat: Infinity, ease: "easeInOut" }}
              />
            ))}

            {/* card */}
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 50 }}
              transition={{ type: "spring", damping: 22, stiffness: 300, mass: 1 }}
              className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2rem] backdrop-blur-xl bg-slate-900/90 border border-emerald-500/30 shadow-2xl shadow-emerald-500/15"
              onClick={(e) => e.stopPropagation()}
            >
              {/* close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-800/70 text-slate-400 hover:bg-slate-700 hover:text-white transition-all cursor-pointer border-none"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>

              {/* inner content */}
              <div className="px-6 sm:px-10 py-8 sm:py-10">

                {/* SMARTBUS header */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="text-center mb-2"
                >
                  <span className="text-emerald-400 text-xl sm:text-2xl font-black tracking-[0.2em] drop-shadow-[0_0_10px_rgba(52,211,153,0.25)]">
                    SMARTBUS
                  </span>
                </motion.div>

                {/* Animated success checkmark */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.25, type: "spring", damping: 12, stiffness: 250 }}
                  className="flex justify-center mb-4"
                >
                  <div className="relative">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.35, duration: 0.4 }}
                      className="bg-gradient-to-br from-emerald-400 to-emerald-600 p-[3px] rounded-full"
                    >
                      <div className="bg-slate-900 rounded-full p-3 sm:p-4">
                        <CheckCircle size={48} className="sm:w-14 sm:h-14 text-emerald-400" strokeWidth={1.5} />
                      </div>
                    </motion.div>
                    {/* glow ring */}
                    <motion.div
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1.4, opacity: 0 }}
                      transition={{ delay: 0.5, duration: 1.2, repeat: Infinity }}
                      className="absolute inset-0 rounded-full bg-emerald-400/20"
                    />
                  </div>
                </motion.div>

                {/* heading */}
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight text-center"
                >
                  Booking Confirmed Successfully!
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-slate-400 text-sm sm:text-base mt-1 mb-5 text-center"
                >
                  Your SmartBus ticket has been successfully reserved.
                </motion.p>

                {/* current time */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.55 }}
                  className="text-center mb-5"
                >
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-700/40">
                    <Calendar size={12} /> {now}
                  </span>
                </motion.div>

                {/* booking id badge */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="text-center mb-6"
                >
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 text-emerald-300 font-mono text-sm font-bold tracking-wider">
                    <Ticket size={16} /> #{bookingId}
                  </span>
                </motion.div>

                {/* ===== MAIN DETAILS GRID ===== */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.65 }}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6"
                >
                  {/* left column — journey */}
                  <div className="bg-slate-950/60 rounded-xl p-4 sm:p-5 border border-slate-800/60 space-y-4">
                    <h3 className="text-[11px] text-slate-500 tracking-wider uppercase font-semibold flex items-center gap-1.5">
                      <Award size={14} className="text-emerald-400" /> Journey Details
                    </h3>
                    <div className="space-y-3">
                      <InfoRow icon={<MapPin size={14} />} label="Passenger" value={formData.fullName} />
                      <InfoRow icon={<Bus size={14} />} label="Route" value={schedule.route?.name || "—"} />
                      <InfoRow icon={<MapPin size={14} />} label="Journey" value={`${startStop || "–"} → ${endStop || "–"}`} />
                      <InfoRow icon={<Bus size={14} />} label="Bus" value={schedule.bus?.busNumber || "—"} />
                      <InfoRow icon={<Calendar size={14} />} label="Date" value={schedule.departureDate?.split("T")[0] || "—"} />
                      <InfoRow icon={<Clock size={14} />} label="Time" value={schedule.departureTime || "—"} />
                      <InfoRow icon={<Ticket size={14} />} label="Seats" value={selectedSeats.join(", ")} highlight />
                      {bookingResult?.discountPercentage > 0 && <InfoRow icon={<Percent size={14} />} label="Discount" value={`${bookingResult.discountType || ''} (${bookingResult.discountPercentage}%)`} highlight />}
                      {bookingResult?.emergencyName && <InfoRow icon={<Heart size={14} />} label="Emergency" value={`${bookingResult.emergencyName} (${bookingResult.emergencyRelationship || "—"}) ${bookingResult.emergencyPhone || ""}`} />}
                    </div>
                  </div>

                  {/* right column — fare & QR */}
                  <div className="bg-slate-950/60 rounded-xl p-4 sm:p-5 border border-slate-800/60 space-y-4">
                    <h3 className="text-[11px] text-slate-500 tracking-wider uppercase font-semibold flex items-center gap-1.5">
                      <CreditCard size={14} className="text-emerald-400" /> Fare Summary
                    </h3>
                    <div className="space-y-2">
                      {(() => {
                        const rawTotal = schedule.fare * selectedSeats.length;
                        const discPct = Number(bookingResult?.discountPercentage) || 0;
                        const discAmt = Math.round(rawTotal * discPct / 100);
                        return (<>
                      {peakHour ? (
                        <>
                          <div className="flex justify-between text-sm text-slate-400">
                            <span>Base fare × {selectedSeats.length}</span>
                            <span>Rs. {(schedule.baseFare || schedule.fare) * selectedSeats.length}</span>
                          </div>
                          <div className="flex justify-between text-sm text-amber-400">
                            <span>Peak surcharge (15%)</span>
                            <span>+ Rs. {Math.round((schedule.fare - (schedule.baseFare || schedule.fare)) * selectedSeats.length)}</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex justify-between text-sm text-slate-400">
                          <span>Fare × {selectedSeats.length} seat{selectedSeats.length > 1 ? "s" : ""}</span>
                          <span>Rs. {rawTotal}</span>
                        </div>
                      )}
                      {discPct > 0 && (
                        <div className="flex justify-between text-sm text-emerald-400">
                          <span>{bookingResult?.discountType || ''} Discount ({discPct}%)</span>
                          <span>- Rs. {discAmt}</span>
                        </div>
                      )}
                      <div className="border-t border-slate-700/40 my-2" />
                      <div className="flex justify-between text-lg sm:text-xl font-black text-emerald-400">
                        <span>Total Fare</span>
                        <span>Rs. {totalFare}</span>
                      </div>
                        </>); })()}
                      {peakHour && (
                        <div className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold px-3 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z"/></svg>
                          Peak-Hour Price Applied
                        </div>
                      )}
                    </div>

                    {/* QR code */}
                    {bookingId && (
                      <div className="pt-3 border-t border-slate-800/50">
                        <p className="text-[10px] text-slate-500 tracking-wider uppercase mb-3 text-center">Boarding Pass</p>
                        <div className="flex items-center justify-center gap-4">
                          <div className="p-2 bg-white rounded-xl shadow-lg shadow-black/30 inline-flex">
                            <QRCodeCanvas value={`${baseUrl}/passenger?bookingId=${bookingId}`} size={100} level="H" />
                          </div>
                          <div className="text-left text-xs text-slate-500 leading-relaxed">
                            <div className="font-semibold text-slate-400 mb-0.5">Scan at boarding</div>
                            <div>Show this QR code to the conductor</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* status badge */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.7 }}
                  className="flex items-center justify-center gap-3 mb-6"
                >
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 text-xs font-bold tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Confirmed
                  </span>
                  <span className="text-xs text-slate-500">·</span>
                  <span className="text-xs text-slate-400">Thank you, {formData.fullName.split(" ")[0]}!</span>
                </motion.div>

                {/* ===== BUTTONS ===== */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="space-y-3"
                >
                  <motion.button
                    onClick={downloadPDF}
                    disabled={generatingPDF}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-3.5 sm:py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black tracking-wider transition-all shadow-lg shadow-emerald-500/25 uppercase text-sm cursor-pointer border-none disabled:opacity-50 disabled:cursor-wait"
                  >
                    {generatingPDF ? (
                      <span className="inline-flex items-center justify-center gap-2">
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Generating PDF...
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center gap-2">
                        <Download size={18} /> Download Ticket (PDF)
                      </span>
                    )}
                  </motion.button>

                  <div className="grid grid-cols-2 gap-3">
                    <motion.button
                      onClick={onViewBookings}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full py-3 rounded-xl bg-slate-800/70 hover:bg-slate-700/70 text-slate-100 font-semibold text-sm transition-all border border-slate-700/50 cursor-pointer flex items-center justify-center gap-2"
                    >
                      View My Bookings <ArrowRight size={16} />
                    </motion.button>
                    <motion.button
                      onClick={onClose}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full py-3 rounded-xl bg-slate-800/70 hover:bg-slate-700/70 text-slate-100 font-semibold text-sm transition-all border border-slate-700/50 cursor-pointer flex items-center justify-center gap-2"
                    >
                      Book Another Trip <ArrowRight size={16} />
                    </motion.button>
                  </div>
                </motion.div>

                {/* closing */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                  className="text-center text-xs text-slate-600 mt-6"
                >
                  🚌 Safe travels! — SmartBus System
                </motion.p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* hidden A4 ticket template for high-quality PDF capture — solid colors only, no opacity/gradients */}
      <div ref={ticketRef} data-ticket-root style={{
        position: "fixed", left: "-9999px", top: 0,
        width: "800px", fontFamily: "Arial, Helvetica, sans-serif",
        background: "#0f172a", color: "#e2e8f0",
      }}>
        {/* outer padding wrapper for page margins */}
        <div style={{ padding: "40px 44px" }}>

          {/* ===== HEADER ===== */}
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <div style={{ fontSize: "30px", fontWeight: 800, color: "#10b981", letterSpacing: "4px", marginBottom: "4px" }}>SMARTBUS</div>
            <div style={{ fontSize: "12px", color: "#64748b", letterSpacing: "1px" }}>E-TICKET · #{bookingId}</div>
            <div style={{ height: "2px", background: "#1e293b", margin: "16px auto 0", width: "100%" }} />
          </div>

          {/* ===== PASSENGER CARD ===== */}
          <div style={{ background: "#020617", border: "1px solid #1e293b", borderRadius: "8px", padding: "20px 24px", marginBottom: "20px" }}>
            <div style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "4px" }}>Passenger</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#f1f5f9", marginBottom: "10px" }}>{formData.fullName}</div>
            <div style={{ display: "flex", gap: "32px", fontSize: "13px", color: "#94a3b8" }}>
              <span>{formData.email}</span>
              <span>{formData.phone}</span>
            </div>
          </div>

          {/* ===== JOURNEY DETAILS ===== */}
          <div style={{ background: "#020617", border: "1px solid #1e293b", borderRadius: "8px", padding: "20px 24px", marginBottom: "20px" }}>
            <div style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "12px" }}>Journey Details</div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {[
                  ["Route", schedule.route?.name || "—"],
                  ["Journey", `${startStop || "–"} → ${endStop || "–"}`],
                  ["Bus", schedule.bus?.busNumber || "—"],
                  ["Departure", `${schedule.departureDate?.split("T")[0] || "—"}  ${schedule.departureTime || "—"}`],
                  ["Seats", selectedSeats.join(", ")],
                  ...(bookingResult?.emergencyName ? [["Emergency", `${bookingResult.emergencyName} (${bookingResult.emergencyRelationship || "—"}) ${bookingResult.emergencyPhone || ""}`]] : []),
                ].map(([label, value], i) => (
                  <tr key={i}>
                    <td style={{ padding: "8px 0", fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "1px", width: "140px", verticalAlign: "top" }}>{label}</td>
                    <td style={{ padding: "8px 0", fontSize: "15px", fontWeight: 700, color: "#f1f5f9", textAlign: "right" }}>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ===== FARE BREAKDOWN ===== */}
          <div style={{ background: "#020617", border: "1px solid #1e293b", borderRadius: "8px", padding: "20px 24px", marginBottom: "24px" }}>
            <div style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "12px" }}>Fare Breakdown</div>
            {schedule?.isPeakHour ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "14px", color: "#94a3b8" }}>
                  <span>Base fare × {selectedSeats.length} seat{selectedSeats.length > 1 ? "s" : ""}</span>
                  <span>Rs. {(schedule.baseFare || schedule.fare) * selectedSeats.length}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "14px", color: "#f59e0b" }}>
                  <span>Peak surcharge (15%)</span>
                  <span>+ Rs. {(schedule.fare - (schedule.baseFare || schedule.fare)) * selectedSeats.length}</span>
                </div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", marginTop: "4px", fontSize: "10px", fontWeight: 600, padding: "3px 10px", borderRadius: "999px", background: "#78350f30", color: "#fbbf24", border: "1px solid #92400e" }}>
                  PEAK-HOUR PRICE APPLIED
                </div>
              </>
            ) : (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "14px", color: "#94a3b8" }}>
                <span>Fare per seat × {selectedSeats.length} seat{selectedSeats.length > 1 ? "s" : ""}</span>
                <span>Rs. {schedule.fare * selectedSeats.length}</span>
              </div>
            )}
            {bookingResult?.discountPercentage > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "14px", color: "#10b981" }}>
                <span>{bookingResult.discountType || ''} Discount ({bookingResult.discountPercentage}%)</span>
                <span>- Rs. {Math.round((schedule.fare * selectedSeats.length) * Number(bookingResult.discountPercentage) / 100)}</span>
              </div>
            )}
            <div style={{ height: "1px", background: "#1e293b", margin: "8px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "20px", fontWeight: 800, color: "#10b981" }}>
              <span>Total Fare</span>
              <span>Rs. {totalFare}</span>
            </div>
          </div>

          {/* ===== QR CODE + FOOTER ===== */}
          <div style={{ display: "flex", alignItems: "center", gap: "28px", justifyContent: "center" }}>
            <div style={{ background: "#ffffff", padding: "10px", borderRadius: "8px", display: "inline-flex" }}>
              <QRCodeCanvas value={`${baseUrl}/passenger?bookingId=${bookingId}`} size={130} level="H" />
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, marginBottom: "2px" }}>Scan at boarding</div>
              <div style={{ fontSize: "10px", color: "#475569" }}>Present this QR code to the conductor</div>
            </div>
          </div>

          {/* ===== FOOTER LINE ===== */}
          <div style={{ marginTop: "28px", textAlign: "center", borderTop: "1px solid #1e293b", paddingTop: "16px" }}>
            <span style={{ fontSize: "10px", color: "#475569" }}>
              <span style={{ color: "#10b981" }}>◆</span> SmartBus System <span style={{ color: "#10b981" }}>◆</span>
            </span>
            <div style={{ fontSize: "9px", color: "#334155", marginTop: "4px" }}>Thank you for choosing SmartBus — safe travels!</div>
          </div>

        </div>
      </div>
    </>
  );
}

function localDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function BookSeatsPage() {
  const { scheduleId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const startStop = searchParams.get("startStop");
  const endStop = searchParams.get("endStop");
  const selectedDate = searchParams.get("date") || localDateStr(new Date());
  const [schedule, setSchedule] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [bookingResult, setBookingResult] = useState(null);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ fullName: "", email: "", phone: "", specialRequests: "" });
  const [heldSeats, setHeldSeats] = useState({});
  const [holdCountdown, setHoldCountdown] = useState({});
  const [discountType, setDiscountType] = useState("None");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyRelationship, setEmergencyRelationship] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");

  const DISCOUNT_CONFIG = { student: { label: "Student", percentage: 10 }, senior: { label: "Senior Citizen", percentage: 15 }, none: { label: "None", percentage: 0 } };
  const HOLD_DURATION_MS = 5 * 60 * 1000;
  const holdCountdownRef = useRef(holdCountdown);
  holdCountdownRef.current = holdCountdown;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [schedRes, seatsRes] = await Promise.all([
          axios.get(`/api/schedules/${scheduleId}?origin=${startStop || ""}&destination=${endStop || ""}&date=${selectedDate}`),
          axios.get(`/api/schedules/${scheduleId}/seats`),
        ]);
        setSchedule(schedRes.data);
        setSeats(seatsRes.data);
        /* load holds separately — tolerate failure if table doesn't exist yet */
        try {
          const holdsRes = await axios.get(`/api/schedules/${scheduleId}/holds`);
          const holds = {};
          holdsRes.data.forEach(h => {
            if (h.userId !== user?.id) holds[h.seatNumber] = { userId: h.userId, expiresAt: new Date(h.expiresAt).getTime() };
          });
          setHeldSeats(holds);
        } catch(e) { console.warn('Holds fetch failed (table may not exist):', e.message); }
      } catch (err) {
        console.error(err);
        alert("Failed to load schedule details");
        navigate("/");
      } finally { setLoading(false); }
    };
    fetchData();
  }, [scheduleId, startStop, endStop, selectedDate, navigate]);

  /* socket — listen for hold/release events */
  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socket.on('seatHeld', (data) => {
      if (String(data.scheduleId) !== scheduleId) return;
      if (data.userId !== user?.id) {
        setHeldSeats(prev => ({ ...prev, [data.seatNumber]: { userId: data.userId, expiresAt: data.expiresAt } }));
      }
    });
    socket.on('seatReleased', (data) => {
      if (String(data.scheduleId) !== scheduleId) return;
      setHeldSeats(prev => {
        const next = { ...prev };
        delete next[data.seatNumber];
        return next;
      });
    });
    return () => socket.disconnect();
  }, [scheduleId, user?.id]);

  /* hold countdown timer — use ref to avoid stale closure */
  useEffect(() => {
    if (selectedSeats.length === 0) { setHoldCountdown({}); return; }
    const interval = setInterval(() => {
      const now = Date.now();
      const updated = {};
      let hasActive = false;
      const snapshot = holdCountdownRef.current;
      selectedSeats.forEach(sn => {
        if (snapshot[sn]) {
          const remaining = Math.max(0, Math.floor((HOLD_DURATION_MS - (now - snapshot[sn].started)) / 1000));
          updated[sn] = { ...snapshot[sn], remaining };
          if (remaining > 0) hasActive = true;
        }
      });
      setHoldCountdown(updated);
      if (!hasActive && selectedSeats.length > 0) {
        selectedSeats.forEach(sn => {
          if (!updated[sn] || updated[sn].remaining <= 0) {
            axios.delete('/api/seats/hold', { data: { scheduleId, seatNumber: sn }, headers: { Authorization: `Bearer ${user?.token}` } }).catch(() => {});
          }
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [selectedSeats, scheduleId, user?.token]);

  const toggleSeat = async (seatNumber) => {
    if (heldSeats[seatNumber] && heldSeats[seatNumber].userId !== user?.id) return; /* held by other */
    if (selectedSeats.includes(seatNumber)) {
      setSelectedSeats(selectedSeats.filter((s) => s !== seatNumber));
      try { await axios.delete('/api/seats/hold', { data: { scheduleId, seatNumber }, headers: { Authorization: `Bearer ${user?.token}` } }); } catch(e) {}
    } else {
      setSelectedSeats([...selectedSeats, seatNumber]);
      setHoldCountdown(prev => ({ ...prev, [seatNumber]: { started: Date.now(), remaining: 300 } }));
      try { await axios.post('/api/seats/hold', { scheduleId, seatNumber }, { headers: { Authorization: `Bearer ${user?.token}` } }); } catch(e) {}
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleContinue = () => {
    if (selectedSeats.length === 0) return alert("Select at least one seat");
    setStep(2);
  };

  const handleCancel = () => {
    setSelectedSeats([]);
  };

  const handleBook = async () => {
    if (!formData.fullName.trim() || !formData.email.trim() || !formData.phone.trim()) return alert("Please fill in all passenger details");
    if (!user) return alert("Please login to book seats");
    setBooking(true);
    try {
      const { data: bookingData } = await axios.post("/api/bookings", {
        scheduleId, seatsToBook: selectedSeats, passengerDetails: formData,
        startStop: startStop || schedule.route?.stops?.[0],
        endStop: endStop || schedule.route?.stops?.[schedule.route?.stops?.length - 1],
        discountType: discountType === "None" ? "none" : discountType.toLowerCase(),
        emergencyName: emergencyName || undefined,
        emergencyRelationship: emergencyRelationship || undefined,
        emergencyPhone: emergencyPhone || undefined,
      }, { headers: { Authorization: `Bearer ${user.token}` } });
      setBookingResult(bookingData);
      setBooking(false);
      setShowSuccess(true);
    } catch (error) {
      setBooking(false);
      alert(error.response?.data?.message || "Booking failed");
    }
  };

  if (loading) return <div className="py-12 px-4 text-center text-slate-400 text-sm">Loading schedule...</div>;
  if (!schedule) return <div className="py-12 px-4 text-center text-slate-400 text-sm">Schedule not found</div>;

  const seatList = schedule.seats && schedule.seats.length > 0 ? schedule.seats : seats;
  const discountObj = DISCOUNT_CONFIG[discountType.toLowerCase()] || DISCOUNT_CONFIG.none;
  const discountPct = discountObj.percentage;
  const discountAmount = Math.round(schedule.fare * selectedSeats.length * discountPct / 100);
  const totalFare = schedule.fare * selectedSeats.length - discountAmount;
  const wizardStep = step === 2 ? 2 : showSuccess ? 3 : 1;
  const wizardSteps = [
    { num: 1, label: "Select Seats", short: "Seats" },
    { num: 2, label: "Passenger Info", short: "Info" },
    { num: 3, label: "Confirmation", short: "Done" },
  ];

  const LegendDot = ({ color, label }) => (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
      <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
      {label}
    </span>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 pb-24">

      <div className="w-full max-w-6xl mx-auto px-4 mt-5 flex flex-col items-center justify-center">

        <div className="w-full max-w-xl flex items-center justify-between mb-4">
          {step === 2 ? (
            <button onClick={() => setStep(1)} className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors bg-transparent border-none cursor-pointer">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              Back
            </button>
          ) : (
            <button onClick={() => navigate("/")} className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors bg-transparent border-none cursor-pointer">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              Back
            </button>
          )}
          <ShareButtons title={`SmartBus - ${schedule?.bus?.busNumber || ""} ${schedule?.route?.name || ""}`} />
        </div>

        <div className="flex items-center w-full max-w-xl mb-6">
          {wizardSteps.map((s, i) => (
            <Fragment key={s.num}>
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-xs md:text-sm font-bold transition-all duration-300 ${
                  wizardStep >= s.num
                    ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30"
                    : "bg-slate-800 text-slate-500"
                }`}>
                  {wizardStep > s.num ? (
                    <svg className="w-4 h-4 md:w-5 md:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : s.num}
                </div>
                <span className={`text-[10px] md:text-xs mt-1.5 font-medium tracking-wide ${
                  wizardStep >= s.num ? "text-emerald-400" : "text-slate-600"
                }`}>
                  <span className="hidden md:inline">{s.label}</span>
                  <span className="md:hidden">{s.short}</span>
                </span>
              </div>
              {i < wizardSteps.length - 1 && (
                <div className={`flex-1 h-[2px] mx-2 md:mx-4 rounded-full transition-all duration-300 ${
                  wizardStep > s.num ? "bg-emerald-500/60" : "bg-slate-800"
                }`} />
              )}
            </Fragment>
          ))}
        </div>

        {step === 1 && !showSuccess && (
          <>

            {/* ===== PREMIUM JOURNEY INFO CARD ===== */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="w-full max-w-5xl mx-auto backdrop-blur-xl bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-slate-950/90 border border-slate-800/60 rounded-2xl p-5 md:p-6 mb-5 shadow-xl"
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 md:gap-5">
                {/* Route */}
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
                    <Bus size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-500 tracking-wider mb-0.5 uppercase font-semibold">Route</p>
                    <p className="text-sm md:text-[15px] font-bold text-slate-100 truncate">{schedule.route?.name || "—"}</p>
                  </div>
                </div>
                {/* Journey */}
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
                    <MapPin size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-500 tracking-wider mb-0.5 uppercase font-semibold">Journey</p>
                    <p className="text-sm md:text-[15px] font-bold text-slate-100 truncate">
                      {startStop || schedule.route?.stops?.[0] || "—"} <span className="text-slate-600">→</span> {endStop || schedule.route?.stops?.[schedule.route?.stops?.length - 1] || "—"}
                    </p>
                  </div>
                </div>
                {/* Departure */}
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
                    <Calendar size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-500 tracking-wider mb-0.5 uppercase font-semibold">Departure</p>
                    <p className="text-sm md:text-[15px] font-bold text-slate-100 truncate">
                      {schedule.departureDate?.split("T")[0] || "—"} <span className="text-slate-400 font-normal">at</span> {schedule.departureTime || "—"}
                    </p>
                  </div>
                </div>
                {/* Fare */}
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
                    <CreditCard size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-500 tracking-wider mb-0.5 uppercase font-semibold">Fare</p>
                    <p className="text-sm md:text-[15px] font-bold text-emerald-400">
                      {schedule.isPeakHour ? (
                        <>
                          <span className="text-slate-500 line-through mr-1">Rs. {schedule.baseFare || schedule.fare}</span>
                          Rs. {schedule.fare}
                        </>
                      ) : `Rs. ${schedule.fare}`}
                      <span className="text-slate-500 font-normal">/seat</span>
                    </p>
                    {schedule.isPeakHour && (
                      <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z"/></svg>
                        Peak-Hour
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom row — bus info + badges */}
              <div className="mt-4 pt-4 border-t border-slate-800/50 flex flex-wrap items-center gap-3 text-xs">
                <span className="inline-flex items-center gap-1 text-slate-400">
                  <Bus size={12} /> {schedule.bus?.busNumber || "—"}
                </span>
                <span className="text-slate-700">|</span>
                <span className="text-slate-400">{schedule.bus?.type || "Standard"}</span>
                {schedule.route?.estimated_duration && (
                  <>
                    <span className="text-slate-700">|</span>
                    <span className="text-slate-400">
                      <Clock size={12} className="inline mr-0.5" />{schedule.route.estimated_duration}
                    </span>
                  </>
                )}
                <span className="text-slate-700">|</span>
                <span className="text-slate-400">{schedule.route?.distance || 0} km</span>
                {schedule.isPeakHour && (
                  <span className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25 font-bold tracking-wide">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z"/></svg>
                    Peak Hour
                  </span>
                )}
                {schedule.bus?.type === "Luxury" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/25 font-bold tracking-wide">
                    <Award size={12} /> Premium
                  </span>
                )}
              </div>
            </motion.div>

            {/* ===== TWO-COLUMN LAYOUT: BUS + SIDEBAR ===== */}
            <div className="flex flex-col lg:flex-row gap-6 w-full max-w-5xl mx-auto">

              {/* LEFT — BUS LAYOUT */}
              <div className="flex-1 min-w-0">

                {/* Seat Legend */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="flex flex-wrap items-center gap-2 sm:gap-4 mb-4 p-3 sm:p-4 rounded-xl bg-slate-900/80 border border-slate-800/60 backdrop-blur-sm"
                >
                  <LegendDot color="bg-emerald-500" label="Available" />
                  <LegendDot color="bg-emerald-600 ring-2 ring-emerald-400/50" label="Selected" />
                  <LegendDot color="bg-violet-500/60" label="Held" />
                  <LegendDot color="bg-red-500/70" label="Booked" />
                  <LegendDot color="bg-amber-500/70" label="Broken" />
                  <span className="text-slate-700 hidden sm:inline">|</span>
                  <span className="text-slate-500 text-xs font-medium hidden sm:flex items-center gap-1">
                    <span className="w-12 h-1.5 rounded-full bg-slate-700 overflow-hidden inline-flex">
                      <span className="h-full bg-emerald-500 rounded-full" style={{ width: `${seatList.length > 0 ? Math.round((seatList.filter(s => !s.isBooked && !s.isBroken && s.status !== "Booked" && s.status !== "Broken").length / seatList.length) * 100) : 0}%` }} />
                    </span>
                    {seatList.filter(s => !s.isBooked && !s.isBroken && s.status !== "Booked" && s.status !== "Broken").length} available
                  </span>
                </motion.div>

                {/* Bus Layout */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                  className="backdrop-blur-xl bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-slate-950/95 border border-slate-800/70 rounded-2xl p-5 md:p-7 shadow-2xl"
                >
                  {/* Driver + Front indicator */}
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800/60">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] text-slate-600 font-semibold tracking-[0.2em] uppercase">Front</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-1">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                          <svg className="w-3 h-3 text-slate-950" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="8" r="3"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></svg>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/50">Driver</span>
                    </div>
                  </div>

                  {/* Seat Grid */}
                  <div className="relative">
                    {/* Entrance door label */}
                    <div className="absolute -left-2 top-1/2 -translate-y-1/2 hidden sm:block">
                      <div className="flex flex-col items-center gap-1 text-[8px] text-slate-600 font-semibold tracking-wider uppercase">
                        <svg className="w-3 h-3 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                        Door
                      </div>
                    </div>

                    <div className="grid grid-cols-[1fr_1fr_2rem_1fr_1fr] gap-x-3 md:gap-x-5 gap-y-3 md:gap-y-4">
                      {seatList.map((seat, index) => {
                        const isBooked = seat.isBooked || seat.status === "Booked";
                        const isBroken = seat.isBroken || seat.status === "Broken";
                        const isHeld = !!heldSeats[seat.seatNumber] && heldSeats[seat.seatNumber].userId !== user?.id;
                        const isSelected = selectedSeats.includes(seat.seatNumber);
                        const seatDisabled = isBooked || isBroken || isHeld;
                        return (
                          <Fragment key={seat._id || seat.id}>
                            {index % 4 === 2 && <div className="w-full" />}
                            <motion.button
                              disabled={seatDisabled}
                              onClick={() => toggleSeat(seat.seatNumber)}
                              whileHover={!seatDisabled ? { scale: 1.08 } : undefined}
                              whileTap={!seatDisabled ? { scale: 0.92 } : undefined}
                              animate={isSelected ? { scale: 1.05 } : undefined}
                              title={
                                isBooked ? `${seat.seatNumber} — Booked` :
                                isBroken ? `${seat.seatNumber} — Broken` :
                                isHeld ? `${seat.seatNumber} — Being selected by another passenger` :
                                isSelected ? `${seat.seatNumber} — Selected` :
                                `${seat.seatNumber} — Available`
                              }
                              className={`w-full py-2.5 md:py-3.5 rounded-xl font-bold text-sm md:text-base transition-colors duration-200 select-none flex items-center justify-center border-2 relative
                                ${isSelected
                                  ? "bg-emerald-600 text-white border-emerald-400 shadow-lg shadow-emerald-500/30 z-10"
                                  : isBooked
                                    ? "bg-red-500/60 text-white/80 border-red-600/50 cursor-not-allowed"
                                    : isBroken
                                      ? "bg-amber-500/60 text-white/80 border-amber-600/50 cursor-not-allowed"
                                      : isHeld
                                        ? "bg-violet-500/50 text-white/80 border-violet-500/60 cursor-not-allowed"
                                        : "bg-slate-800/60 text-slate-200 border-slate-700/60 hover:bg-emerald-900/30 hover:border-emerald-500/60 cursor-pointer"
                                }
                              `}
                            >
                              <span className={isSelected ? "drop-shadow-[0_0_4px_rgba(255,255,255,0.4)]" : ""}>
                                {seat.seatNumber}
                              </span>
                            </motion.button>
                          </Fragment>
                        );
                      })}
                    </div>
                  </div>

                  {/* Floor line + occupancy */}
                  <div className="mt-6 pt-4 border-t border-slate-800/60">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${seatList.length > 0 ? Math.round((seatList.filter(s => s.isBooked || s.status === 'Booked').length / seatList.length) * 100) : 0}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className={`h-full rounded-full ${
                            (seatList.filter(s => s.isBooked || s.status === 'Booked').length / seatList.length) > 0.7
                              ? "bg-red-500" : (seatList.filter(s => s.isBooked || s.status === 'Booked').length / seatList.length) > 0.4
                                ? "bg-amber-500" : "bg-emerald-500"
                          }`}
                        />
                      </div>
                      <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
                        {seatList.filter(s => s.isBooked || s.status === "Booked").length}/{seatList.length} booked
                      </span>
                    </div>
                  </div>
                </motion.div>

                {/* Selected Seats Chips */}
                {selectedSeats.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-3 sm:p-4 rounded-xl bg-slate-900/80 border border-slate-800/60 backdrop-blur-sm"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-slate-500 font-semibold tracking-wider uppercase">
                        Selected Seats <span className="text-emerald-400">({selectedSeats.length})</span>
                      </p>
                      {Object.keys(holdCountdown).length > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-400 font-bold">
                          <Timer size={12} />
                          {(() => {
                            const min = Math.floor(Math.min(...Object.values(holdCountdown).map(v => v.remaining || 0)) / 60);
                            const sec = Math.min(...Object.values(holdCountdown).map(v => v.remaining || 0)) % 60;
                            return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
                          })()}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[...selectedSeats].sort((a, b) => {
                        const numA = parseInt(String(a).replace(/\D/g, ""), 10);
                        const numB = parseInt(String(b).replace(/\D/g, ""), 10);
                        return numA - numB;
                      }).map((seat) => (
                        <motion.span
                          key={seat}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          layout
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-sm font-bold"
                        >
                          {seat}
                          <button
                            onClick={() => toggleSeat(seat)}
                            className="text-emerald-400/60 hover:text-emerald-300 transition-colors cursor-pointer bg-transparent border-none p-0"
                            aria-label={`Remove seat ${seat}`}
                          >
                            <X size={14} />
                          </button>
                        </motion.span>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Journey Timeline */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="mt-4 p-3 sm:p-4 rounded-xl bg-slate-900/80 border border-slate-800/60 backdrop-blur-sm hidden sm:block"
                >
                  <p className="text-xs text-slate-500 font-semibold tracking-wider uppercase mb-3">Journey</p>
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/30" />
                      <div className="w-0.5 h-10 bg-gradient-to-b from-emerald-500 to-slate-700" />
                      <div className="w-3 h-3 rounded-full bg-slate-700" />
                    </div>
                    <div className="flex flex-col gap-8 text-sm">
                      <div>
                        <p className="text-slate-100 font-bold">{startStop || schedule.route?.stops?.[0] || "—"}</p>
                        <p className="text-xs text-slate-500">{schedule.departureTime || "—"}</p>
                      </div>
                      <div>
                        <p className="text-slate-100 font-bold">{endStop || schedule.route?.stops?.[schedule.route?.stops?.length - 1] || "—"}</p>
                        <p className="text-xs text-slate-500">Arrival</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* RIGHT — STICKY SIDEBAR */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="w-full lg:w-80 shrink-0"
              >
                <div className="lg:sticky lg:top-6 space-y-4">
                  {/* Summary Card */}
                  <div className="backdrop-blur-xl bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-slate-950/95 border border-slate-800/70 rounded-2xl p-5 shadow-2xl">
                    <h3 className="text-xs text-slate-500 font-semibold tracking-wider uppercase mb-4 flex items-center gap-2">
                      <Ticket size={14} className="text-emerald-400" /> Booking Summary
                    </h3>

                    {/* Seats */}
                    <div className="space-y-3 mb-4 pb-4 border-b border-slate-800/60">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Seats</span>
                        <span className="text-slate-100 font-bold">
                          {selectedSeats.length > 0
                            ? [...selectedSeats].sort((a, b) => parseInt(String(a).replace(/\D/g, ""), 10) - parseInt(String(b).replace(/\D/g, ""), 10)).join(", ")
                            : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Passengers</span>
                        <span className="text-slate-100 font-bold">{selectedSeats.length || 0}</span>
                      </div>
                    </div>

                    {/* Fare */}
                    <div className="space-y-2 mb-4 pb-4 border-b border-slate-800/60">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Fare / seat</span>
                        <span className="text-slate-300">Rs. {schedule.fare}</span>
                      </div>
                      {schedule.isPeakHour && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Peak surcharge</span>
                          <span className="text-amber-400">+ 15%</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Total fare</span>
                        <span className="text-slate-300">Rs. {schedule.fare * (selectedSeats.length || 1)}</span>
                      </div>
                    </div>

                    {/* Total */}
                    <div className="flex justify-between items-center mb-5">
                      <span className="text-sm text-slate-300 font-semibold">You pay</span>
                      <span className="text-xl md:text-2xl font-black text-emerald-400">Rs. {totalFare}</span>
                    </div>

                    {/* Continue */}
                    <motion.button
                      onClick={handleContinue}
                      disabled={selectedSeats.length === 0}
                      whileHover={selectedSeats.length > 0 ? { scale: 1.02 } : undefined}
                      whileTap={selectedSeats.length > 0 ? { scale: 0.98 } : undefined}
                      className="w-full py-3.5 md:py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black tracking-wide text-sm md:text-base transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer border-none"
                    >
                      {selectedSeats.length > 0
                        ? `Continue — Rs. ${totalFare}`
                        : "Select a Seat"}
                    </motion.button>

                    {/* Cancel */}
                    {selectedSeats.length > 0 && (
                      <motion.button
                        onClick={handleCancel}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full mt-2 py-3 rounded-2xl text-sm text-slate-400 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 transition-colors cursor-pointer"
                      >
                        Clear Selection
                      </motion.button>
                    )}

                    {/* Peak badge */}
                    {schedule.isPeakHour && (
                      <div className="mt-4 pt-4 border-t border-slate-800/60">
                        <div className="flex items-center gap-2 text-[11px] text-amber-400/80">
                          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z"/></svg>
                          Peak-hour pricing applies — 15% surcharge
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Safety notice */}
                  <div className="hidden lg:block p-4 rounded-xl bg-slate-900/60 border border-slate-800/50">
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      <span className="text-emerald-400 font-semibold">🚌 Safe Travels</span><br />
                      Masks recommended. Arrive 15 min before departure. E-ticket will be sent after booking.
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* ===== MOBILE BOTTOM BAR ===== */}
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-slate-900/95 backdrop-blur-xl border-t border-slate-800/80 p-3"
            >
              <div className="flex items-center justify-between gap-3 max-w-5xl mx-auto">
                <div>
                  <p className="text-xs text-slate-400">
                    <span className="text-emerald-400 font-bold text-sm">{selectedSeats.length}</span> seat{selectedSeats.length !== 1 ? "s" : ""}
                  </p>
                  <p className="text-base font-black text-emerald-400">Rs. {totalFare}</p>
                </div>
                <div className="flex gap-2">
                  {selectedSeats.length > 0 && (
                    <button onClick={handleCancel} className="px-4 py-2.5 rounded-xl text-sm text-slate-400 bg-slate-800 border border-slate-700 cursor-pointer">Cancel</button>
                  )}
                  <button
                    onClick={handleContinue}
                    disabled={selectedSeats.length === 0}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer border-none whitespace-nowrap"
                  >
                    Continue ➔
                  </button>
                </div>
              </div>
            </motion.div>

          </>
        )}

        {step === 2 && (
          <div className="w-full max-w-6xl mx-auto">

            {/* single premium glass card — expanded */}
            <div className="relative backdrop-blur-xl bg-slate-900/90 border border-emerald-500/30 shadow-2xl shadow-emerald-500/10 rounded-[2rem] p-8 md:p-10 overflow-hidden">

              {/* subtle emerald glow accent */}
              <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-24 h-24 rounded-full bg-emerald-500/5 blur-2xl pointer-events-none" />

              {/* centered brand */}
              <div className="text-center mb-8">
                <span className="text-emerald-300 text-2xl md:text-3xl font-black tracking-[0.15em] drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]">SMARTBUS</span>
              </div>

              {/* refined booking summary ribbon */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-8 py-5 px-6 bg-slate-950/60 rounded-xl border border-slate-800/60">
                <div className="flex items-center gap-2 text-base">
                  <svg className="w-5 h-5 text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  <span className="text-slate-200 font-semibold truncate max-w-[160px]">{startStop || schedule.route?.stops?.[0] || "—"}</span>
                  <span className="text-slate-600">→</span>
                  <span className="text-slate-200 font-semibold truncate max-w-[160px]">{endStop || schedule.route?.stops?.[schedule.route?.stops?.length - 1] || "—"}</span>
                </div>
                <div className="flex items-center gap-2 text-base">
                  <svg className="w-5 h-5 text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  <span className="text-slate-200">{schedule.departureDate?.split("T")[0]}</span>
                  <svg className="w-4 h-4 text-emerald-400/70 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  <span className="text-slate-200">{schedule.departureTime}</span>
                </div>
                <div className="flex items-center gap-2 text-base ml-auto">
                  <svg className="w-5 h-5 text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-sm font-bold border border-emerald-500/20">{selectedSeats.join(", ")}</span>
                  <span className="text-slate-100 font-bold text-base">Rs. {totalFare}</span>
                </div>
              </div>

              {!user && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-6 text-center">
                  <p className="text-red-400 text-sm">Please <a href="/login" className="text-emerald-400 underline hover:text-emerald-300">login</a> to complete your booking.</p>
                </div>
              )}

              {/* two-column layout: form + right ribbon */}
              <div className="flex gap-8">
                {/* left — form fields in 2-column grid */}
                <div className="flex-1 min-w-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block mb-1.5 text-sm text-slate-300 font-semibold tracking-wider uppercase">Full Name <span className="text-red-400">*</span></label>
                      <input type="text" name="fullName" value={formData.fullName} onChange={handleInputChange} placeholder="Enter your full name" required
                        className="w-full py-3.5 px-5 rounded-xl bg-slate-800/40 border border-slate-700/50 text-white text-base placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/50 transition-all" />
                    </div>
                    <div>
                      <label className="block mb-1.5 text-sm text-slate-300 font-semibold tracking-wider uppercase">Email <span className="text-red-400">*</span></label>
                      <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="Enter your email" required
                        className="w-full py-3.5 px-5 rounded-xl bg-slate-800/40 border border-slate-700/50 text-white text-base placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/50 transition-all" />
                    </div>
                    <div>
                      <label className="block mb-1.5 text-sm text-slate-300 font-semibold tracking-wider uppercase">Phone Number <span className="text-red-400">*</span></label>
                      <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="Enter your phone number" required
                        className="w-full py-3.5 px-5 rounded-xl bg-slate-800/40 border border-emerald-500/30 text-white text-base placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/50 transition-all" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block mb-1.5 text-sm text-slate-300 font-semibold tracking-wider uppercase">Special Requests</label>
                      <input type="text" name="specialRequests" value={formData.specialRequests} onChange={handleInputChange} placeholder="Any special requests?" 
                        className="w-full py-3.5 px-5 rounded-xl bg-slate-800/40 border border-slate-700/50 text-white text-base placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/50 transition-all" />
                    </div>

                    {/* Discount Type */}
                    <div className="md:col-span-2">
                      <label className="block mb-1.5 text-sm text-slate-300 font-semibold tracking-wider uppercase">
                        <Percent size={14} className="inline mr-1 text-emerald-400" /> Discount Type
                      </label>
                      <div className="flex gap-3">
                        {Object.entries(DISCOUNT_CONFIG).map(([key, cfg]) => (
                          <button key={key} type="button"
                            onClick={() => setDiscountType(key === 'none' ? 'None' : key.charAt(0).toUpperCase() + key.slice(1))}
                            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer border ${
                              discountType === (key === 'none' ? 'None' : key.charAt(0).toUpperCase() + key.slice(1))
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                                : 'bg-slate-800/40 text-slate-400 border-slate-700/50 hover:border-slate-600'
                            }`}
                          >
                            {cfg.label}{cfg.percentage > 0 ? ` (${cfg.percentage}%)` : ''}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Emergency Contact */}
                    <div className="md:col-span-2 mt-2">
                      <div className="flex items-center gap-2 mb-3 text-sm text-slate-400 font-semibold tracking-wider uppercase">
                        <Heart size={14} className="text-emerald-400" /> Emergency Contact <span className="text-[10px] text-slate-600 font-normal tracking-normal normal-case">(optional)</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block mb-1 text-xs text-slate-500">Contact Name</label>
                          <input type="text" value={emergencyName} onChange={e => setEmergencyName(e.target.value)} placeholder="Full name"
                            className="w-full py-3 px-4 rounded-xl bg-slate-800/40 border border-slate-700/50 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/50 transition-all" />
                        </div>
                        <div>
                          <label className="block mb-1 text-xs text-slate-500">Relationship</label>
                          <input type="text" value={emergencyRelationship} onChange={e => setEmergencyRelationship(e.target.value)} placeholder="e.g. Spouse, Parent"
                            className="w-full py-3 px-4 rounded-xl bg-slate-800/40 border border-slate-700/50 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/50 transition-all" />
                        </div>
                        <div>
                          <label className="block mb-1 text-xs text-slate-500">Phone Number</label>
                          <input type="tel" value={emergencyPhone} onChange={e => setEmergencyPhone(e.target.value)} placeholder="Phone number"
                            className="w-full py-3 px-4 rounded-xl bg-slate-800/40 border border-slate-700/50 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/50 transition-all" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* right — vertical seat info ribbon */}
                <div className="hidden md:flex flex-col items-center justify-center min-w-[100px] w-[100px] rounded-2xl bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20">
                  <svg className="w-7 h-7 text-emerald-400 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  <span className="text-emerald-400 text-2xl font-black leading-none mb-0.5">{selectedSeats.join(", ") || "—"}</span>
                  <span className="text-slate-400 text-sm font-semibold mb-1">{selectedSeats.length} Seat{selectedSeats.length > 1 ? "s" : ""}</span>
                  <div className="w-10 h-px bg-emerald-500/30 my-1" />
                  <span className="text-slate-100 text-lg font-black">Rs. {totalFare}</span>
                </div>
              </div>

              {/* total and CTA */}
              <div className="mt-8 pt-6 border-t border-slate-700/40 flex items-center justify-between">
                <span className="text-base text-slate-500">Total amount</span>
                <span className="text-2xl font-black text-emerald-400">Rs. {totalFare}</span>
              </div>

              <button onClick={handleBook} disabled={booking || !user}
                className={`mt-6 w-full py-5 rounded-2xl font-black tracking-widest uppercase text-base transition-all duration-300 cursor-pointer border-none ${
                  booking || !user
                    ? "bg-slate-700/50 text-slate-500 cursor-not-allowed"
                    : "bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40 active:scale-[0.98]"
                }`}>
                {booking ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Processing...
                  </span>
                ) : "Confirm Booking"}
              </button>
              <button onClick={() => setStep(1)}
                className="mt-4 w-full py-4 rounded-2xl font-semibold text-base text-slate-400 bg-slate-800/30 hover:bg-slate-700/30 border border-slate-700/50 transition-colors cursor-pointer">
                Back to Seats
              </button>
            </div>
          </div>
        )}

      </div>

      {showSuccess && (
        <BookingSuccessModal
          schedule={schedule} selectedSeats={selectedSeats} formData={formData}
          totalFare={totalFare}
          startStop={startStop || schedule.route?.stops?.[0]}
          endStop={endStop || schedule.route?.stops?.[schedule.route?.stops?.length - 1]}
          onViewBookings={() => navigate("/passenger")}
          bookingResult={bookingResult}
          onClose={() => { setShowSuccess(false); setStep(1); }}
        />
      )}

    </div>
  );
}
