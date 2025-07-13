import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request) {
  try {
    const { zone } = await request.json();

    if (!zone) {
      return NextResponse.json({ error: 'Zone is required' }, { status: 400 });
    }

    const deliveries = await prisma.deliveries.findMany({
      where: {
        zone: zone
      },
      select: {
        id: true,
        pickup_point: true,
        drop_point: true,
        description: true,
        item_weight: true,
        dimensions: true,
        value: true,
        speed: true,
        zone: true,
        time_slot: true,
        fragile: true,
        status: true,
        delivery_cost: true,
        carbon_saved: true,
        created_at: true
      }
    });

    return NextResponse.json({ deliveries }, { status: 200 });
  } catch (error) {
    console.error('Error fetching deliveries:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
