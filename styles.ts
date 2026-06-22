export const linkedInCopilotStyles = `
      .copilot-dropdown {
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
          overflow: hidden;
          margin: 15px 0px;
      }

      .copilot-capsule-container {
          display: flex;
          align-items: center;
          gap: 8px;
          overflow-x: auto;
          overflow-y: hidden;
          padding: 8px 5px;
          font-size: 12px;
          scrollbar-width: none;
          -ms-overflow-style: none;
          width: 100%;
      }

      .copilot-capsule-container::-webkit-scrollbar {
          display: none;
      }

      .copilot-capsule {
        padding: 12px 16px;
        border-radius: 30px;
        cursor: pointer;
        border: 1px solid currentColor;
        transition: background-color 0.2s ease;
        white-space: nowrap;
      }
        .copilot-capsule-ai {
          background: linear-gradient(163deg, #3c52d0 0%, #544067 100%);
          border: none;
          color: #fff;

        }
      
      .copilot-dropdown-option:first-child:hover {
        background: linear-gradient(135deg, #f0f2ff 0%, #e8ebff 100%);
      }
      
      .linkedin-auto-reply-notification {
        position: fixed;
        max-width: 300px;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        color: white;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
        font-size: 14px;
        font-weight: 500;
        z-index: 10000;
        transform: translateX(130%);
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

      .aiDirectDmReplyButton {
        margin: 5px 5px 0px auto;
        padding: 12px 16px;
        cursor: pointer;
        transition: background-color 0.2s ease;
        white-space: nowrap;
        color: #fff;
        width: fit-content;
        border-radius: 11px;
        font-size: 12px;
        background: linear-gradient(163deg, #3c52d0 0%, #544067 100%);
      }

      /* AI Processing Animation */
      .ai-processing {
        position: relative;
        overflow: hidden;
      }

      .ai-processing::before {
        content: '';
        position: absolute;
        top: -2px;
        left: -2px;
        right: -2px;
        bottom: -2px;
        background: conic-gradient(
          from 0deg,
          #6366f1,
          #8b5cf6,
          #ec4899,
          #f59e0b,
          #10b981,
          #06b6d4,
          #6366f1
        );
        border-radius: inherit;
        animation: ai-rotate 2s linear infinite;
        z-index: -1;
      }

      .ai-processing::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: inherit;
        border-radius: inherit;
        z-index: -1;
      }

      /* Pulsing glow effect */
      .ai-processing {
        animation: ai-pulse 1.5s ease-in-out infinite alternate;
        box-shadow: 
          0 0 20px rgba(99, 102, 241, 0.3),
          0 0 40px rgba(139, 92, 246, 0.2),
          0 0 60px rgba(236, 72, 153, 0.1);
      }

      @keyframes ai-rotate {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }

      @keyframes ai-pulse {
        0% {
          box-shadow: 
            0 0 20px rgba(99, 102, 241, 0.3),
            0 0 40px rgba(139, 92, 246, 0.2),
            0 0 60px rgba(236, 72, 153, 0.1);
        }
        100% {
          box-shadow: 
            0 0 30px rgba(99, 102, 241, 0.5),
            0 0 60px rgba(139, 92, 246, 0.3),
            0 0 80px rgba(236, 72, 153, 0.2);
        }
      }

      /* Subtle inner glow for text elements */
      // .ai-processing input,
      // .ai-processing textarea,
      // .ai-processing [contenteditable] {
      //   background: linear-gradient(45deg, 
      //     rgba(99, 102, 241, 0.05), 
      //     rgba(139, 92, 246, 0.05),
      //     rgba(236, 72, 153, 0.05)
      //   );
      // }

      /* Optional: Add shimmer effect for extra flair */
      .ai-processing-shimmer::before {
        background: linear-gradient(
          90deg,
          transparent 0%,
          rgba(255, 255, 255, 0.4) 50%,
          transparent 100%
        );
        animation: ai-shimmer 2s ease-in-out infinite;
      }

      @keyframes ai-shimmer {
        0% {
          transform: translateX(-100%);
        }
        100% {
          transform: translateX(100%);
        }
      }

      .writeWithAiTip {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin: 10px 0 15px;
        padding: 12px 16px;
        border-radius: 8px;
        background: rgba(102, 126, 234, 0.05);
        border: 1px dashed rgba(102, 126, 234, 0.3);
      }
      .writeWithAiTipText {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        font-size: 13px;
        font-weight: 500;
        line-height: 1.4;
      }
      .writeWithAiButton {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white !important;
        -webkit-text-fill-color: white !important;
        border: none;
        border-radius: 20px;
        padding: 6px 16px;
        font-size: 12px;
        font-weight: bold;
        cursor: pointer;
        width: fit-content;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        transition: transform 0.1s ease, box-shadow 0.1s ease;
      }
      .writeWithAiButton:active {
        transform: scale(0.98);
        box-shadow: 0 1px 2px rgba(0,0,0,0.1);
      }
    `
