import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import indiaData from './india-data.json';

export function useLocationData() {
  const [states, setStates] = useState<string[]>([]);
  const [districtsMap, setDistrictsMap] = useState<Record<string, string[]>>({});
  const [blocksMap, setBlocksMap] = useState<Record<string, string[]>>({});
  const [schoolsMap, setSchoolsMap] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
        const fallbackStates = indiaData.map(d => d.name).sort();
        const fallbackDistricts: Record<string, string[]> = {};
        indiaData.forEach(d => {
          fallbackDistricts[d.name] = d.districts;
        });
        
        try {
        const snap = await getDoc(doc(db, 'locations', 'master'));
        if (snap.exists()) {
          const d = snap.data();
          if (d.states) setStates(d.states);
          if (d.districts) setDistrictsMap(d.districts);
          if (d.blocks) setBlocksMap(d.blocks);
          if (d.schools) setSchoolsMap(d.schools);
        } else {
          // Fallback to static if db is totally empty
          setStates(fallbackStates);
          setDistrictsMap(fallbackDistricts);
        }
      } catch (err) {
        console.warn("Falling back to static locations. DB err:", err);
        setStates(fallbackStates);
        setDistrictsMap(fallbackDistricts);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const getDistrictsForState = (state: string) => districtsMap[state] || [];
  const getBlocksForDistrict = (state: string, district: string) => blocksMap[`${state}|${district}`] || [];
  const getSchoolsForBlock = (state: string, district: string, block: string) => schoolsMap[`${state}|${district}|${block}`] || [];

  return { states, getDistrictsForState, getBlocksForDistrict, getSchoolsForBlock, loading };
}
