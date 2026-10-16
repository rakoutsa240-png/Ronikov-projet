import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '../types';
import { ProfilePhoto } from './ProfilePhoto';

// jsdom has no canvas: the cut and shrink step is replaced by a ready-made JPEG.
vi.mock('../photo', () => ({ squarePhoto: vi.fn(async () => new Blob(['jpeg'], { type: 'image/jpeg' })) }));

const user: AuthUser = {
  id: 'u1',
  name: 'Kossi Mensah',
  phone: '+22892230001',
  email: null,
  role: 'ATTENDANT',
  isPremium: false,
  managedStationIds: ['st-01'],
  mustChangePassword: false,
  photoUrl: null,
};

afterEach(() => vi.unstubAllGlobals());

describe('ProfilePhoto', () => {
  it('shows the initial, then sends the chosen picture', async () => {
    const withPhoto = { ...user, photoUrl: '/api/users/u1/photo?v=1' };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(withPhoto), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const onUserChanged = vi.fn();
    const { container } = render(<ProfilePhoto user={user} onUserChanged={onUserChanged} />);

    expect(screen.getByText('K')).toBeTruthy();
    expect(screen.getByText(/clients que vous servez voient votre photo/)).toBeTruthy();
    const input = container.querySelector('input[type=file]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['x'], 'moi.jpg', { type: 'image/jpeg' })] } });

    await waitFor(() => expect(onUserChanged).toHaveBeenCalledWith(withPhoto));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/me/photo');
    expect(init).toMatchObject({ method: 'PUT', headers: expect.objectContaining({ 'Content-Type': 'image/jpeg' }) });
  });

  it('shows the photo and lets its owner remove it', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(user), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const onUserChanged = vi.fn();
    render(<ProfilePhoto user={{ ...user, photoUrl: '/api/users/u1/photo?v=1' }} onUserChanged={onUserChanged} />);

    expect(screen.getByAltText('Photo de Kossi Mensah').getAttribute('src')).toBe('/api/users/u1/photo?v=1');
    fireEvent.click(screen.getByText('Retirer'));
    await waitFor(() => expect(onUserChanged).toHaveBeenCalledWith(user));
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'DELETE' });
  });
});
