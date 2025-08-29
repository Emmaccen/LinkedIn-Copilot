export const linkedInCopilotStyles = `
      .copilot-capsule-container {
          display: flex;
          align-items: center;
          gap: 10px;
          overflow: scroll;
          padding: 15px 5px;
      }
      
      .copilot-capsule {
        padding: 12px 16px;
        border-radius: 30px;
        cursor: pointer;
        border: 1px solid #ffffff66;
        transition: background-color 0.2s ease;
        white-space: nowrap;
      }
      
      .copilot-ai-badge {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .copilot-dropdown-option:first-child {
        background: linear-gradient(135deg, #f8f9ff 0%, #f0f2ff 100%);
      }
      
      .copilot-dropdown-option:first-child:hover {
        background: linear-gradient(135deg, #f0f2ff 0%, #e8ebff 100%);
      }
      
      .linkedin-auto-reply-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        color: white;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
        font-size: 14px;
        font-weight: 500;
        z-index: 10000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }
      
      .linkedin-auto-reply-notification.show {
        transform: translateX(0);
      }
      
      .linkedin-auto-reply-notification.info {
        background-color: #0073b1;
      }
      
      .linkedin-auto-reply-notification.success {
        background-color: #057642;
      }
      
      .linkedin-auto-reply-notification.warning {
        background-color: #f5a623;
      }
      
      .linkedin-auto-reply-notification.error {
        background-color: #d93025;
      }

    `
