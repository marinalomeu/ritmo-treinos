import InviteSignup from '../../../components/InviteSignup';
type Props={params:Promise<{token:string}>};
export default async function InvitePage({params}:Props){
  const {token}=await params;
  return <InviteSignup token={token}/>;
}
