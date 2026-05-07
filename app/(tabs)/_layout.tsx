import { Tabs } from 'expo-router';
import React from 'react';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
      }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="chat" />
      <Tabs.Screen name="economia" />
      <Tabs.Screen name="contactos" />
      <Tabs.Screen name="incidencias" />
      <Tabs.Screen name="documentos" />
      <Tabs.Screen name="votaciones" />
      <Tabs.Screen name="explore" />
    </Tabs>
  );
}