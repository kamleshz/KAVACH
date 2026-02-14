import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';

const IdleTimer = ({ timeout = 10 * 60 * 1000 }) => { // Default: 10 minutes
  const [isIdle, setIsIdle] = useState(false);
  const lastActivityRef = useRef(Date.now());
  const intervalRef = useRef(null);

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    
    const handleActivity = () => {
      // Only update timestamp if not currently showing the idle modal
      if (!isIdle) {
        lastActivityRef.current = Date.now();
      }
    };

    // Attach listeners
    events.forEach(event => window.addEventListener(event, handleActivity));

    // Check for idleness every 5 seconds
    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivityRef.current;
      
      if (timeSinceLastActivity >= timeout && !isIdle) {
        setIsIdle(true);
      }
    }, 5000); 

    return () => {
      events.forEach(event => window.removeEventListener(event, handleActivity));
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timeout, isIdle]);

  const handleClose = () => {
    setIsIdle(false);
    lastActivityRef.current = Date.now(); // Reset activity on close
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', color: '#faad14' }}>
          <ExclamationCircleOutlined style={{ marginRight: 8, fontSize: '22px' }} />
          <span>Inactivity Alert</span>
        </div>
      }
      open={isIdle}
      onOk={handleClose}
      onCancel={handleClose}
      footer={[
        <Button key="back" type="primary" onClick={handleClose} size="large">
          I'm Back
        </Button>,
      ]}
      closable={false}
      maskClosable={false}
      centered
      zIndex={9999} // Ensure it appears above everything
    >
      <div style={{ padding: '10px 0' }}>
        <p style={{ fontSize: '16px', marginBottom: '8px' }}>
          You have been inactive for more than 10 minutes.
        </p>
        <p style={{ color: '#666' }}>
          Please click the button below to continue working.
        </p>
      </div>
    </Modal>
  );
};

export default IdleTimer;
