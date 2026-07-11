import { useListContent } from '@workspace/api-client-react';

export function useContentDict() {
  const { data: content = [], isLoading } = useListContent();
  
  const dict = content.reduce((acc, item) => {
    acc[item.key] = item.value;
    return acc;
  }, {} as Record<string, string>);

  return { dict, isLoading };
}
