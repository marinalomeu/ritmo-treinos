import {notFound} from 'next/navigation';
import {currentProfile,hasOwnerRole} from '../../../lib/multiuser';
import InviteAdmin from '../../../components/InviteAdmin';
export const dynamic='force-dynamic';
export default async function InvitesPage(){
  const profile=await currentProfile();
  if(!hasOwnerRole(profile))notFound();
  return <InviteAdmin/>;
}
