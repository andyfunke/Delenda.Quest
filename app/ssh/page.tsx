import { requireAuthenticatedUser } from "../auth";
import { SshKeyManager } from "./SshKeyManager";

export default async function SshAccessPage(){
  await requireAuthenticatedUser("/ssh");
  return <SshKeyManager/>;
}
