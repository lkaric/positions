import { type MatchPrimitiveType } from 'web3';

interface CdpData {
  id: number;
  urn: string;
  owner: string;
  userAddr: string;
  ilk: MatchPrimitiveType<'bytes32', unknown>;
  collateral: MatchPrimitiveType<'uint256', unknown>;
  debt: MatchPrimitiveType<'uint256', unknown>;
}

export { type CdpData };
