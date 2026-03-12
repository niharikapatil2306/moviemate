import Image from 'next/image';
import logo from '@/logo.png';

export default function LogoBanner() {
  return (
    <Image src={logo} alt="MovieMate" height={55} priority />
  );
}
