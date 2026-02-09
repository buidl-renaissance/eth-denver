import React from "react";
import Head from "next/head";
import Splash from "@/components/Splash";
import { useUser } from "@/contexts/UserContext";

// App configuration - customize these
const APP_NAME = "App Block";

export const getServerSideProps = async () => {
  return {
    props: {
      metadata: {
        title: `Enter | ${APP_NAME}`,
        description: `Enter ${APP_NAME} - Your app description here.`,
      },
    },
  };
};

const AppEntryPage: React.FC = () => {
  const { user, isLoading } = useUser();

  return (
    <>
      <Head>
        <title>Enter | {APP_NAME}</title>
        <meta name="description" content={`Enter ${APP_NAME}`} />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <Splash user={user} isLoading={isLoading} appName={APP_NAME} />
    </>
  );
};

export default AppEntryPage;
