// ============================================
// BEAUTYBOT - EMBED SCRIPT
// Universal chatbot widget for client websites
// ============================================

(function() {
  'use strict';
  
  // Global namespace
  window.BeautyBot = window.BeautyBot || {};
  
  let config = {
    userId: null,
    position: 'right', // 'right' or 'left'
    primaryColor: '#C4737F',
    buttonText: '💬',
    autoOpen: false,
    debug: false
  };
  
  let isOpen = false;
  let iframe = null;
  let button = null;
  
  // ============================================
  // INITIALIZATION
  // ============================================
  window.BeautyBot.init = function(userId, options = {}) {
    if (!userId) {
      console.error('BeautyBot: userId is required');
      return;
    }
    
    config.userId = userId;
    config = { ...config, ...options };
    
    if (config.debug) console.log('BeautyBot initialized:', config);
    
    // Wait for DOM
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', createWidget);
    } else {
      createWidget();
    }
  };
  
  // ============================================
  // CREATE WIDGET
  // ============================================
  function createWidget() {
    createButton();
    createIframe();
    attachEventListeners();
    
    if (config.autoOpen) {
      setTimeout(() => openWidget(), 1000);
    }
  }
  
  // ============================================
  // CREATE FLOATING BUTTON
  // ============================================
  function createButton() {
    button = document.createElement('div');
    button.id = 'beautybot-button';
    button.innerHTML = config.buttonText;
    
    // Styles
    Object.assign(button.style, {
      position: 'fixed',
      bottom: '20px',
      [config.position]: '20px',
      width: '60px',
      height: '60px',
      borderRadius: '50%',
      backgroundColor: config.primaryColor,
      color: 'white',
      fontSize: '28px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      zIndex: '999999',
      transition: 'all 0.3s ease',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    });
    
    // Hover effect
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'scale(1.1)';
      button.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)';
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1)';
      button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    });
    
    // Click to toggle
    button.addEventListener('click', toggleWidget);
    
    document.body.appendChild(button);
  }
  
  // ============================================
  // CREATE IFRAME
  // ============================================
  function createIframe() {
    iframe = document.createElement('iframe');
    iframe.id = 'beautybot-iframe';
    iframe.src = `https://beautybot.pt/widget.html?userId=${config.userId}`;
    iframe.allow = 'microphone'; // For future voice features
    
    // Styles
    Object.assign(iframe.style, {
      position: 'fixed',
      bottom: '90px',
      [config.position]: '20px',
      width: '380px',
      height: '600px',
      maxHeight: 'calc(100vh - 120px)',
      border: 'none',
      borderRadius: '12px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
      zIndex: '999998',
      display: 'none',
      transition: 'all 0.3s ease',
      backgroundColor: 'white'
    });
    
    document.body.appendChild(iframe);
  }
  
  // ============================================
  // TOGGLE WIDGET
  // ============================================
  function toggleWidget() {
    if (isOpen) {
      closeWidget();
    } else {
      openWidget();
    }
  }
  
  function openWidget() {
    if (!iframe) return;
    
    iframe.style.display = 'block';
    setTimeout(() => {
      iframe.style.opacity = '1';
      iframe.style.transform = 'translateY(0)';
    }, 10);
    
    button.innerHTML = '✕';
    button.style.transform = 'rotate(90deg)';
    isOpen = true;
    
    if (config.debug) console.log('BeautyBot opened');
  }
  
  function closeWidget() {
    if (!iframe) return;
    
    iframe.style.opacity = '0';
    iframe.style.transform = 'translateY(10px)';
    
    setTimeout(() => {
      iframe.style.display = 'none';
    }, 300);
    
    button.innerHTML = config.buttonText;
    button.style.transform = 'rotate(0deg)';
    isOpen = false;
    
    if (config.debug) console.log('BeautyBot closed');
  }
  
  // ============================================
  // EVENT LISTENERS
  // ============================================
  function attachEventListeners() {
    // Listen for messages from iframe
    window.addEventListener('message', function(event) {
      // Security: verify origin
      if (event.origin !== 'https://beautybot.pt') return;
      
      const { action, data } = event.data;
      
      switch(action) {
        case 'close':
          closeWidget();
          break;
        case 'resize':
          if (data.height) {
            iframe.style.height = `${Math.min(data.height, window.innerHeight - 120)}px`;
          }
          break;
        case 'debug':
          if (config.debug) console.log('BeautyBot widget:', data);
          break;
      }
    });
    
    // Close on ESC key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && isOpen) {
        closeWidget();
      }
    });
    
    // Responsive adjustments
    window.addEventListener('resize', adjustForMobile);
    adjustForMobile();
  }
  
  // ============================================
  // MOBILE ADJUSTMENTS
  // ============================================
  function adjustForMobile() {
    const isMobile = window.innerWidth < 768;
    
    if (isMobile && iframe) {
      iframe.style.width = 'calc(100vw - 20px)';
      iframe.style.height = 'calc(100vh - 100px)';
      iframe.style.bottom = '10px';
      iframe.style[config.position] = '10px';
      
      button.style.bottom = '15px';
      button.style[config.position] = '15px';
    } else if (iframe) {
      iframe.style.width = '380px';
      iframe.style.height = '600px';
      iframe.style.bottom = '90px';
      iframe.style[config.position] = '20px';
      
      button.style.bottom = '20px';
      button.style[config.position] = '20px';
    }
  }
  
  // ============================================
  // PUBLIC API
  // ============================================
  window.BeautyBot.open = openWidget;
  window.BeautyBot.close = closeWidget;
  window.BeautyBot.toggle = toggleWidget;
  window.BeautyBot.destroy = function() {
    if (button) button.remove();
    if (iframe) iframe.remove();
    isOpen = false;
    if (config.debug) console.log('BeautyBot destroyed');
  };
  
})();
