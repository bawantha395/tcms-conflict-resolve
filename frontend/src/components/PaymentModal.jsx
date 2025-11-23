import React, { useState } from 'react';
import CustomButton from './CustomButton';
import CustomTextField from './CustomTextField';

const PaymentModal = ({ open, onClose, enrollment, student, onPay }) => {
  const [amount, setAmount] = useState(enrollment ? (enrollment.dueAmount || 0) : 0);
  const [method, setMethod] = useState('cash');
  const [note, setNote] = useState('');

  if (!open) return null;

  const handlePay = () => {
    onPay && onPay({ amount: Number(amount), method, note });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-3">Process Payment</h3>
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="text-xs text-gray-600">Student</label>
            <div className="font-medium">{student?.name || student?.fullname || student?.firstName}</div>
            <div className="text-xs text-gray-500">ID: {student?.userid || student?.id}</div>
          </div>
          <div>
            <label className="text-xs text-gray-600">Class</label>
            <div className="font-medium">{enrollment?.className}</div>
          </div>
          <CustomTextField id="amount" name="amount" label="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <div>
            <label className="text-xs text-gray-600">Method</label>
            <select className="w-full border rounded p-2 mt-1" value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="online">Online</option>
            </select>
          </div>
          <CustomTextField id="note" name="note" label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex gap-2 justify-end mt-4">
            <CustomButton onClick={onClose} className="bg-gray-200 text-gray-700">Cancel</CustomButton>
            <CustomButton onClick={handlePay} className="bg-blue-600 text-white">Pay</CustomButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
