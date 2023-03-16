import { Logger } from 'edumeet-common';
import MediaNode from '../media/MediaNode';
import { Peer } from '../Peer';
import Room from '../Room';
import GeoStrategy from './GeoStrategy';
import LBStrategy, { LB_STRATEGIES } from './LBStrategy';
import LBStrategyFactory from './LBStrategyFactory';
import LoadStrategy from './LoadStrategy';
import StickyStrategy from './StickyStrategy';

const logger = new Logger('LoadBalancer');

export interface LoadBalancerOptions {
	room: Room,
	peer: Peer,
	copyOfMediaNodes: MediaNode[]
}

/**
 * Sort media-nodes using load balancing strategies.
 */
export default class LoadBalancer {
	private strategies: Map<string, LBStrategy>;
	private stickyStrategy: StickyStrategy;
	private loadStrategy: LoadStrategy;

	constructor(factory: LBStrategyFactory) {
		logger.debug('constructor() [factory: %s]', factory);
		this.stickyStrategy = factory.createStickyStrategy();
		this.loadStrategy = factory.createLoadStrategy();
		this.strategies = factory.createStrategies();
	}

	public getCandidates({
		copyOfMediaNodes,
		room,
		peer
	}: LoadBalancerOptions): LbCandidates {
		try {
			logger.debug('getCandidates() [room.id: %s, peer.id: %s]', room.id, peer.id);
			let mediaNodes: MediaNode[];

			mediaNodes = this.stickyStrategy.getCandidates(copyOfMediaNodes, room);

			const geoStrategy = this.strategies.get(
				LB_STRATEGIES.GEO
			) as unknown as GeoStrategy;

			if (this.strategies.has(LB_STRATEGIES.GEO)) {
				mediaNodes = geoStrategy.getCandidates(copyOfMediaNodes, mediaNodes, peer);
			}
			mediaNodes = this.loadStrategy.getCandidates(copyOfMediaNodes, mediaNodes);

			if (mediaNodes.length > 0) {
				return this.createCandidates(mediaNodes);
			} else {
				return this.createCandidates(copyOfMediaNodes);
			}

		} catch (err) {
			if (err instanceof Error) logger.error('Error while getting candidates');
			
			return [];
		}
	}

	private createCandidates(mediaNodes: MediaNode[]): LbCandidates {
		const ids: string[] = [];	

		mediaNodes.forEach((node) => {
			ids.push(node.id);
		});
		
		return ids;
	}
}

export type LbCandidates = string[]