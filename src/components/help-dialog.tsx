"use client";

import { Dialog } from "./dialog";
import { Icon } from "./icon";

export function HelpDialog({ onClose }: { onClose: () => void }) {
  return (
    <Dialog title="มารู้จัก 3 เกาะกัน!" onDismiss={onClose} className="help-dialog">
      <button className="dialog-close" aria-label="ปิดวิธีเล่น" onClick={onClose}><Icon name="close" /></button>
      <p className="dialog-lead">พาเพื่อนลูกบอลสีไปส่งที่เกาะให้ถูกโทน</p>
      <div className="help-groups">
        <div className="help-group warm"><span className="help-symbol">☀</span><div><h3>เกาะโทนร้อน</h3><p>แดง · ส้ม · ชมพู</p></div></div>
        <div className="help-group cool"><span className="help-symbol">❄</span><div><h3>เกาะโทนเย็น</h3><p>น้ำเงิน · ฟ้า · เขียว</p></div></div>
        <div className="help-group both"><span className="help-symbol">✦</span><div><h3>เกาะสองโทน</h3><p>ม่วง · เหลือง</p></div></div>
      </div>
      <p className="help-note"><strong>สีเหลืองและสีม่วงเป็นได้ทั้งโทนร้อนและโทนเย็น</strong><br />ในเกมนี้ ให้ส่งไปที่ <strong>เกาะสองโทนเท่านั้น</strong></p>
      <div className="help-steps"><Icon name="hand" /><p>ลากลูกบอลไปวางบนเกาะ หรือกดเลือกเกาะได้เลย<br /><span>ตอบผิดไม่เป็นไร ดูเฉลยแล้วลองลูกเดิมอีกครั้งนะ</span></p></div>
      <button className="primary-button" onClick={onClose}>เข้าใจแล้ว ไปกันเลย! <Icon name="arrow" /></button>
    </Dialog>
  );
}
