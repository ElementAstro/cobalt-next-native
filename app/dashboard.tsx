/**
 * Dashboard screen providing unified overview of all app features
 * Accessible via navigation without disrupting existing flow
 */

import React from 'react';
import { View } from 'react-native';
import { UnifiedDashboard } from '~/components/dashboard/unified-dashboard';
import { ServiceProvider } from '~/lib/services/service-provider';
import { useRouter } from 'expo-router';
import { toast } from 'sonner-native';

export default function DashboardScreen() {
  const router = useRouter();

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'new-download':
        router.push('/download');
        break;
      
      case 'quick-scan':
        // Would open quick scan modal or navigate to scanner
        toast.success('Quick scan feature coming soon!');
        break;
      
      case 'settings':
        // Would open settings modal
        toast.success('Settings feature coming soon!');
        break;
      
      case 'resume-all':
        // Would resume all paused downloads
        toast.success('Resuming all downloads...');
        break;
      
      default:
        console.log('Unknown quick action:', action);
    }
  };

  return (
    <ServiceProvider>
      <View className="flex-1 bg-background">
        <UnifiedDashboard onQuickAction={handleQuickAction} />
      </View>
    </ServiceProvider>
  );
}
