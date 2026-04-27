import { Metadata } from 'next';

import NotFoundContent from './not-found-content';

export const metadata: Metadata = {
  title: {
    absolute: 'Page not Found',
  },
};

export default function NotFound() {
  return <NotFoundContent />;
}
