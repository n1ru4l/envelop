import { Tab, Tabs, TabList, TabPanels, TabPanel, TabsProps } from '@chakra-ui/react';
import create from 'zustand';
import { persist } from 'zustand/middleware';
import { CopyToClipboard } from './CopyToClipboard';
import { useMemo, useState, useEffect } from 'react';

const useCurrentInstaller = create<{
  current: 0 | 1 | 2;
  setPNPM: () => void;
  setYarn: () => void;
  setNPM: () => void;
}>(
  persist(
    set => {
      return {
        current: 0,
        setPNPM: () =>
          set({
            current: 0,
          }),
        setYarn: () =>
          set({
            current: 1,
          }),
        setNPM: () =>
          set({
            current: 2,
          }),
      };
    },
    {
      name: 'PackageManager',
    }
  )
);

export function PackageInstall({ packageName, ...props }: { packageName: string } & TabsProps) {
  const { current, setNPM, setPNPM, setYarn } = useCurrentInstaller();

  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(current);
  }, [current]);

  const currentContent = useMemo(() => {
    switch (current) {
      case 0:
        return `pnpm add ${packageName}`;
      case 1:
        return `yarn add ${packageName}`;
      case 2:
        return `npm install ${packageName}`;
    }
  }, [current]);
  return (
    <>
      <br />
      <Tabs
        position="relative"
        shadow="md"
        borderWidth="1px"
        borderRadius="5px"
        width="fit-content"
        index={index}
        onChange={index => {
          switch (index) {
            case 0:
              return setPNPM();
            case 1:
              return setYarn();
            case 2:
              return setNPM();
          }
        }}
        {...props}
      >
        <TabList>
          <Tab>pnpm</Tab>
          <Tab>yarn</Tab>
          <Tab>npm</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>pnpm add {packageName}</TabPanel>
          <TabPanel>yarn add {packageName}</TabPanel>
          <TabPanel>npm install {packageName}</TabPanel>
        </TabPanels>
        <CopyToClipboard value={currentContent} />
      </Tabs>
    </>
  );
}
