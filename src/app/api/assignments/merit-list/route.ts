import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';

type MeritListItem = {
  id: number;
  register_id: number;
  file_name: string;
  rating: number;
  registerState?: string | null;
  registerDistrict?: string | null;
  registerMandal?: string | null;
  state?: string | null;
  district?: string | null;
  mandal?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  user_email?: string | null;
  context?: string | null;
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT 
           a.id,
           a.register_id,
           a.file_name,
           a.final_rating,
           a.state,
           a.district,
           a.mandal,
           a.context,
           a.first_name,
           a.last_name,
           r.email AS user_email
         FROM assignments a
         LEFT JOIN register r ON a.register_id = r.id
         WHERE a.final_rating IS NOT NULL
         ORDER BY a.final_rating DESC`
      );

      const rows = result.rows || [];

      if (!rows.length) {
        return NextResponse.json({
          success: true,
          data: {
            topStatePerformers: [],
            topDistrictPerformers: [],
            topMandalPerformers: [],
            overallChampion: null,
          },
        });
      }

      const performers: (MeritListItem & {
        registerState: string | null;
        registerDistrict: string | null;
        registerMandal: string | null;
      })[] = rows.map((row) => ({
        id: Number(row.id),
        register_id: Number(row.register_id),
        file_name: row.file_name,
        rating: Number(row.final_rating),
        registerState: row.state ?? null,
        registerDistrict: row.district ?? null,
        registerMandal: row.mandal ?? null,
        state: row.state ?? null,
        district: row.district ?? null,
        mandal: row.mandal ?? null,
        first_name: row.first_name ?? null,
        last_name: row.last_name ?? null,
        user_email: row.user_email ?? null,
        context: row.context ?? null,
      }));

      const hasRatings = performers.length > 0;

      if (!hasRatings) {
        return NextResponse.json({
          success: true,
          data: {
            topStatePerformers: [],
            topDistrictPerformers: [],
            topMandalPerformers: [],
            overallChampion: null,
          },
        });
      }

      const toMeritItem = (p: typeof performers[number]): MeritListItem => ({
        id: p.id,
        register_id: p.register_id,
        file_name: p.file_name,
        rating: p.rating,
        registerState: p.registerState,
        registerDistrict: p.registerDistrict,
        registerMandal: p.registerMandal,
        state: p.state,
        district: p.district,
        mandal: p.mandal,
        first_name: p.first_name,
        last_name: p.last_name,
        user_email: p.user_email,
        context: p.context,
      });

      const topStatePerformers = performers.slice(0, 3).map((p) => ({
        state: p.registerState || 'N/A',
        records: [toMeritItem(p)],
      }));

      const districtMap = new Map<string, typeof performers>();
      for (const p of performers) {
        if (!p.registerDistrict) continue;
        const key = p.registerDistrict as string;
        if (!districtMap.has(key)) {
          districtMap.set(key, [] as any);
        }
        const arr = districtMap.get(key)! as any[];
        if (arr.length < 3) {
          arr.push(p);
        }
      }

      const topDistrictPerformers = Array.from(districtMap.entries())
        .slice(0, 3)
        .map(([district, list]) => ({
          district,
          records: (list as typeof performers).map(toMeritItem),
        }));

      const mandalMap = new Map<string, typeof performers>();
      for (const p of performers) {
        if (!p.registerMandal) continue;
        const key = p.registerMandal as string;
        if (!mandalMap.has(key)) {
          mandalMap.set(key, [] as any);
        }
        const arr = mandalMap.get(key)! as any[];
        if (arr.length < 3) {
          arr.push(p);
        }
      }

      const topMandalPerformers = Array.from(mandalMap.entries())
        .slice(0, 3)
        .map(([mandal, list]) => ({
          mandal,
          records: (list as typeof performers).map(toMeritItem),
        }));

      const best = performers[0];
      const overallChampion = best ? toMeritItem(best) : null;

      return NextResponse.json({
        success: true,
        data: {
          topStatePerformers,
          topDistrictPerformers,
          topMandalPerformers,
          overallChampion,
        },
      });
    } finally {
      client.release();
    }
  } catch (err) {
    return NextResponse.json(
      { error: 'Server Error', details: `${err}` },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
