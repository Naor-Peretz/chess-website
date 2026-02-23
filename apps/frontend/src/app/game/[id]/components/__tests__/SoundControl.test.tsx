import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { SoundControl } from '../SoundControl';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Mock useAriaLiveAnnouncer
const mockAnnounce = vi.fn();
vi.mock('@/hooks/useAriaLiveAnnouncer', () => ({
  useAriaLiveAnnouncer: () => ({ announce: mockAnnounce }),
}));

describe('SoundControl', () => {
  const defaultProps = {
    volume: 70,
    isMuted: false,
    onVolumeChange: vi.fn(),
    onToggleMute: vi.fn(),
  };

  it('renders mute button and volume slider', () => {
    render(<SoundControl {...defaultProps} />);

    expect(screen.getByTestId('mute-button')).toBeInTheDocument();
    expect(screen.getByTestId('volume-slider')).toBeInTheDocument();
    expect(screen.getByTestId('sound-control')).toBeInTheDocument();
  });

  it('mute button has correct aria-label when unmuted', () => {
    render(<SoundControl {...defaultProps} />);

    const button = screen.getByTestId('mute-button');
    expect(button).toHaveAttribute('aria-label', 'Mute sound');
  });

  it('mute button has correct aria-label when muted', () => {
    render(<SoundControl {...defaultProps} isMuted={true} />);

    const button = screen.getByTestId('mute-button');
    expect(button).toHaveAttribute('aria-label', 'Unmute sound');
  });

  it('calls onToggleMute when mute button clicked', () => {
    const onToggleMute = vi.fn();
    render(<SoundControl {...defaultProps} onToggleMute={onToggleMute} />);

    fireEvent.click(screen.getByTestId('mute-button'));
    expect(onToggleMute).toHaveBeenCalledTimes(1);
  });

  it('announces mute state change', () => {
    const { rerender } = render(<SoundControl {...defaultProps} isMuted={false} />);

    // Rerender with muted=true to trigger announcement
    rerender(<SoundControl {...defaultProps} isMuted={true} />);
    expect(mockAnnounce).toHaveBeenCalledWith('Sound muted');

    rerender(<SoundControl {...defaultProps} isMuted={false} />);
    expect(mockAnnounce).toHaveBeenCalledWith('Sound enabled');
  });

  it('volume slider has correct attributes', () => {
    render(<SoundControl {...defaultProps} volume={70} />);

    const slider = screen.getByTestId('volume-slider');
    expect(slider).toHaveAttribute('type', 'range');
    expect(slider).toHaveAttribute('min', '0');
    expect(slider).toHaveAttribute('max', '100');
    expect(slider).toHaveAttribute('step', '10');
    expect(slider).toHaveAttribute('aria-label', 'Volume');
    expect(slider).toHaveValue('70');
  });

  it('calls onVolumeChange when slider changes', () => {
    const onVolumeChange = vi.fn();
    render(<SoundControl {...defaultProps} onVolumeChange={onVolumeChange} />);

    fireEvent.change(screen.getByTestId('volume-slider'), { target: { value: '50' } });
    expect(onVolumeChange).toHaveBeenCalledWith(50);
  });

  it('volume slider has aria-valuetext', () => {
    render(<SoundControl {...defaultProps} volume={70} />);

    const slider = screen.getByTestId('volume-slider');
    expect(slider).toHaveAttribute('aria-valuetext', '70%');
  });
});
