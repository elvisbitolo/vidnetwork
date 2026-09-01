import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import AccountTabs from "../AccountTabs";
import ProfileEditor from "../ProfileEditor";
import styles from "../account.module.css";
import { loadAccount } from "../account-data";
import { QUIZ_QUESTIONS } from "@/lib/profile/questions";

export const dynamic = "force-dynamic";

export default async function AccountProfilePage() {
  const data = await loadAccount();
  if (!data) redirect("/login");
  const { user, userDoc } = data;

  const initialProfile = {
    name: userDoc?.name || user.name || "",
    username: userDoc?.username || "",
    headline: userDoc?.headline || "",
    location: userDoc?.location || "",
    country: userDoc?.country || "",
    bio: userDoc?.bio || "",
    favoriteColors: Array.isArray(userDoc?.favoriteColors) ? userDoc.favoriteColors : [],
    crafts: Array.isArray(userDoc?.crafts) ? userDoc.crafts : [],
    goToYarn: userDoc?.goToYarn || "",
    favoriteHookSize: userDoc?.favoriteHookSize || "",
    yearsExperience: userDoc?.yearsExperience || "",
    favoriteYarnBrand: userDoc?.favoriteYarnBrand || "",
    crochetTechniques: Array.isArray(userDoc?.crochetTechniques) ? userDoc.crochetTechniques : [],
    crochetMotivation: Array.isArray(userDoc?.crochetMotivation) ? userDoc.crochetMotivation : [],
    learningNext: userDoc?.learningNext || "",
    proudestProject: userDoc?.proudestProject || "",
    bestGiftProject: userDoc?.bestGiftProject || "",
    photoURL: userDoc?.photoURL || "",
    coverPhotoURL: userDoc?.coverPhotoURL || "",
    socialLinks: Array.isArray(userDoc?.socialLinks) ? userDoc.socialLinks : [],
  };

  for (const q of QUIZ_QUESTIONS) {
    initialProfile[q.field] = (userDoc || {})[q.field] ?? "";
  }

  return (
    <Nav role={userDoc?.role}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Your profile</h1>
        </header>
        <AccountTabs />
        <ProfileEditor initial={initialProfile} />
      </div>
    </Nav>
  );
}