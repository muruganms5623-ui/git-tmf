import { DeleteFilled } from '@ant-design/icons';
import { useState, useRef } from 'react';
import { Avatar, Modal } from 'antd';

const SwipeablePanel = ({
  item,
  titleKey,
  onSwipeRight,
  onSwipeLeft,
  renderContent,
  isExpanded,

  
  onExpandToggle,
  avatarSrc
}) => {
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const isScrolling = useRef(false);
  const startY = useRef(0);

  const { confirm } = Modal;
  const SWIPE_THRESHOLD = 60;
  const BUTTON_WIDTH = 80;
  const TAP_THRESHOLD = 10;

  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    isScrolling.current = false;
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    const deltaX = e.touches[0].clientX - startX.current;
    const deltaY = e.touches[0].clientY - startY.current;

    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      isScrolling.current = true;
      return;
    }

    if (!isScrolling.current) {
      setOffset(deltaX);
    }
  };

  const handleTouchEnd = () => {
    if (isScrolling.current) {
      setOffset(0);
      setIsDragging(false);
      return;
    }

    const diff = offset;
    const maxSwipe = BUTTON_WIDTH;

    if (diff > SWIPE_THRESHOLD) {
      setOffset(maxSwipe);
    } else if (diff < -SWIPE_THRESHOLD) {
      setOffset(-maxSwipe);
    } else {
      if (Math.abs(diff) < TAP_THRESHOLD) {
        onExpandToggle && onExpandToggle(item);
      }
      setOffset(0);
    }

    setIsDragging(false);
  };

  const backgroundColor = offset > 0 ? '#1890ff' : offset < 0 ? '#ff4d4f' : '#fff';

  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: backgroundColor,
        transition: isDragging ? 'none' : 'background 0.25s ease-out',
        marginBottom: 4,
        borderRadius: 8,
      }}
    >
      {/* Left (Edit) button */}
      {onSwipeRight && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: BUTTON_WIDTH,
            display: 'flex',
            justifyContent: 'flex-start',
            alignItems: 'center',
            paddingLeft: 5,
            color: '#fff',
            fontWeight: 500,
            zIndex: 0
          }}
          onClick={() => {
            onSwipeRight(item);
            setOffset(0);
          }}
        >
          <span className='mdi mdi-pencil' style={{ fontSize: '20px', marginRight: 4 }}></span>
          Edit
        </div>
      )}

      {/* Right (Delete) button */}
      {onSwipeLeft && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: BUTTON_WIDTH,
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            paddingRight: 6,
            color: '#fff',
            fontWeight: 500,
            zIndex: 0
          }}
          onClick={() => {
            confirm({
              title: 'Are you sure you want to delete?',
              icon: <DeleteFilled style={{ color: '#ff4d4f' }} />,
              okText: 'Delete',
              cancelText: 'Cancel',
              onOk() {
                onSwipeLeft(item);
              },
              onCancel() {
                setOffset(0);
              },
            });
          }}
        >
          <DeleteFilled /> Delete
        </div>
      )}

      {/* Foreground content */}
      <div
        style={{
          position: 'relative',
          background: '#fff',
          borderRadius: 8,
          transform: `translateX(${offset}px)`,
          transition: isDragging ? 'none' : 'transform 0.25s ease-out',
          zIndex: 1,
          userSelect: 'none'
        }}
      >
        {/* Header */}
        <div
          className="px-4 py-3"
          style={{
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
          onTouchStart={isExpanded ? null : handleTouchStart}
          onTouchMove={isExpanded ? null : handleTouchMove}
          onTouchEnd={isExpanded ? () => onExpandToggle && onExpandToggle(item) : handleTouchEnd}
        >
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 10, 
              flex: 1,
              minWidth: 0,
              overflow: 'visible',
              // Reserve space for delete button when swiping left
              marginRight: offset < 0 ? '80px' : 0,
              transition: isDragging ? 'none' : 'margin-right 0.25s ease-out'
            }}
          >
            <Avatar src={avatarSrc} size={36} style={{ flexShrink: 0 }} />
            <h5 
              style={{ 
                margin: 0, 
                fontWeight: 600,
                wordBreak: 'break-word',
                flex: 1,
                minWidth: 0,
                lineHeight: '1.4'
              }}
            >
              {item[titleKey]}
            </h5>
          </div>
          <span
            className={`mdi mdi-chevron-${isExpanded ? 'up' : 'down'}`}
            style={{ 
              fontSize: 20, 
              color: '#8c8c8c',
              flexShrink: 0,
              marginLeft: 8
            }}
          />
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div style={{ marginTop: 8, padding: '0 16px' }}>
            {renderContent && renderContent()}
          </div>
        )}
      </div>
    </div>
  );
};

export default SwipeablePanel;
